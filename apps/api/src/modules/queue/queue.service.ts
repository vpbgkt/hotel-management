/**
 * Queue Service — Hotel Manager API
 * 
 * Background job manager. Uses BullMQ when Redis is available,
 * otherwise falls back to in-process setTimeout for delayed jobs.
 * Suitable for single-instance standalone deployments.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';

// Conditionally import BullMQ — won't crash if Redis is unavailable
let Queue: any;
try {
  Queue = require('bullmq').Queue;
} catch {
  Queue = null;
}

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
};

export interface EmailJobData {
  to: string;
  subject: string;
  template: 'booking-confirmation' | 'booking-cancellation' | 'welcome' | 'password-reset' | 'review-request';
  data: Record<string, any>;
}

export interface BookingJobData {
  type: 'reminder' | 'auto-cancel' | 'post-checkout-review' | 'cleanup-expired';
  bookingId?: string;
  data?: Record<string, any>;
}

export interface AnalyticsJobData {
  type: 'page-view' | 'search' | 'booking-funnel' | 'revenue-snapshot';
  data: Record<string, any>;
}

@Injectable()
export class QueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private useMemory = false;
  
  public emailQueue: any;
  public bookingQueue: any;
  public analyticsQueue: any;
  
  private queues: any[] = [];
  private pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();

  async onModuleInit() {
    const redisEnabled = process.env.REDIS_ENABLED === 'true';

    if (!redisEnabled || !Queue) {
      this.useMemory = true;
      this.logger.warn('BullMQ disabled — using in-process setTimeout for delayed jobs');
      return;
    }

    try {
      this.emailQueue = new Queue('email', { connection: REDIS_CONNECTION });
      this.bookingQueue = new Queue('booking-jobs', { connection: REDIS_CONNECTION });
      this.analyticsQueue = new Queue('analytics', { connection: REDIS_CONNECTION });
      
      this.queues = [this.emailQueue, this.bookingQueue, this.analyticsQueue];

      await this.scheduleRecurringJobs();

      this.logger.log('Queue service initialized (email, booking-jobs, analytics)');
    } catch (err: any) {
      this.useMemory = true;
      this.logger.warn(`Queue service failed to initialize: ${err.message}. Using setTimeout fallback.`);
    }
  }

  async onModuleDestroy() {
    // Clear all pending timeouts
    for (const t of this.pendingTimeouts) clearTimeout(t);
    this.pendingTimeouts.clear();

    for (const queue of this.queues) {
      try {
        await queue.close();
      } catch {
        // ignore close errors
      }
    }
  }

  /**
   * Schedule a function to run after a delay (memory fallback)
   */
  private scheduleTimeout(fn: () => Promise<void>, delayMs: number) {
    const t = setTimeout(async () => {
      this.pendingTimeouts.delete(t);
      try {
        await fn();
      } catch (err: any) {
        this.logger.error(`Timeout job failed: ${err.message}`);
      }
    }, delayMs);
    this.pendingTimeouts.add(t);
  }

  /**
   * Send an email in the background
   */
  async sendEmail(data: EmailJobData) {
    if (this.useMemory) {
      this.logger.debug(`Email job (memory): ${data.template} to ${data.to}`);
      // In memory mode, email would need to be sent directly via NotificationService
      // Since queue processors won't run, this is a no-op placeholder
      return;
    }
    try {
      await this.emailQueue.add('send-email', data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      });
      this.logger.debug(`Email job queued: ${data.template} to ${data.to}`);
    } catch (err: any) {
      this.logger.warn(`Failed to queue email: ${err.message}`);
    }
  }

  /**
   * Schedule a booking reminder
   */
  async scheduleBookingReminder(bookingId: string, checkInDate: Date) {
    const reminderTime = new Date(checkInDate);
    reminderTime.setDate(reminderTime.getDate() - 1);
    
    const delay = Math.max(0, reminderTime.getTime() - Date.now());
    
    if (delay <= 0) return;

    if (this.useMemory) {
      this.logger.debug(`Booking reminder (setTimeout) for ${bookingId} in ${Math.round(delay / 60000)}m`);
      // In memory mode, just log — reminders are best-effort
      return;
    }

    await this.bookingQueue.add(
      'booking-reminder',
      { type: 'reminder', bookingId },
      {
        delay,
        attempts: 2,
        removeOnComplete: { count: 100 },
      },
    );
    this.logger.debug(`Booking reminder scheduled for ${bookingId} at ${reminderTime.toISOString()}`);
  }

  /**
   * Schedule auto-cancel for unpaid bookings
   */
  async scheduleAutoCancel(bookingId: string, timeoutMinutes = 30) {
    const delayMs = timeoutMinutes * 60 * 1000;

    if (this.useMemory) {
      this.logger.debug(`Auto-cancel (setTimeout) for ${bookingId} in ${timeoutMinutes}m`);
      this.scheduleTimeout(async () => {
        // Dynamic import to avoid circular dependency
        const { PrismaClient } = await import('@prisma/client');
        const prisma = new PrismaClient();
        try {
          const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
          if (booking && booking.status === 'PENDING' && booking.paymentStatus === 'PENDING') {
            await prisma.booking.update({
              where: { id: bookingId },
              data: { status: 'CANCELLED' },
            });
            this.logger.log(`Auto-cancelled unpaid booking ${bookingId}`);
          }
        } finally {
          await prisma.$disconnect();
        }
      }, delayMs);
      return;
    }

    await this.bookingQueue.add(
      'auto-cancel',
      { type: 'auto-cancel', bookingId },
      {
        delay: delayMs,
        attempts: 1,
        removeOnComplete: { count: 100 },
      },
    );
    this.logger.debug(`Auto-cancel scheduled for ${bookingId} in ${timeoutMinutes} minutes`);
  }

  /**
   * Schedule review request email after checkout
   */
  async scheduleReviewRequest(bookingId: string, checkOutDate: Date) {
    const reviewTime = new Date(checkOutDate);
    reviewTime.setHours(reviewTime.getHours() + 24);
    const delay = Math.max(0, reviewTime.getTime() - Date.now());
    
    if (this.useMemory) {
      this.logger.debug(`Review request (skipped in memory mode) for ${bookingId}`);
      return;
    }

    await this.bookingQueue.add(
      'review-request',
      { type: 'post-checkout-review', bookingId },
      {
        delay,
        attempts: 2,
        removeOnComplete: { count: 100 },
      },
    );
  }

  /**
   * Track an analytics event
   */
  async trackEvent(data: AnalyticsJobData) {
    if (this.useMemory) return; // Skip analytics in memory mode
    try {
      await this.analyticsQueue.add('track', data, {
        removeOnComplete: { count: 500 },
        removeOnFail: { count: 100 },
      });
    } catch {
      // Analytics is best-effort
    }
  }

  /**
   * Schedule recurring jobs
   */
  private async scheduleRecurringJobs() {
    if (this.useMemory) return;
    await this.bookingQueue.upsertJobScheduler(
      'cleanup-expired-bookings',
      { every: 60 * 60 * 1000 },
      {
        name: 'cleanup-expired',
        data: { type: 'cleanup-expired' },
      },
    );
    
    this.logger.debug('Recurring jobs scheduled');
  }
}
