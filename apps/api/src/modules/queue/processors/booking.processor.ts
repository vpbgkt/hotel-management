/**
 * Booking Processor — Hotel Manager API
 * 
 * BullMQ worker that processes booking-related background jobs.
 * Only starts when Redis is enabled.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BookingJobData, QueueService } from '../queue.service';

// Conditionally import BullMQ
let Worker: any, Job: any;
try {
  const bullmq = require('bullmq');
  Worker = bullmq.Worker;
  Job = bullmq.Job;
} catch {
  Worker = null;
}

const REDIS_CONNECTION = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
};

@Injectable()
export class BookingProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingProcessor.name);
  private worker: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async onModuleInit() {
    if (process.env.REDIS_ENABLED !== 'true' || !Worker) {
      this.logger.warn('Booking processor skipped (Redis disabled)');
      return;
    }

    this.worker = new Worker(
      'booking-jobs',
      async (job: any) => {
        switch (job.data.type) {
          case 'auto-cancel':
            return this.handleAutoCancel(job);
          case 'reminder':
            return this.handleReminder(job);
          case 'post-checkout-review':
            return this.handleReviewRequest(job);
          case 'cleanup-expired':
            return this.handleCleanupExpired(job);
          default:
            this.logger.warn(`Unknown booking job type: ${job.data.type}`);
        }
      },
      { connection: REDIS_CONNECTION, concurrency: 3 },
    );

    this.worker.on('completed', (job: any) => {
      this.logger.debug(`Booking job completed: ${job.data.type} ${job.data.bookingId || ''}`);
    });

    this.worker.on('failed', (job: any, err: any) => {
      this.logger.error(`Booking job failed: ${job?.data.type}: ${err.message}`);
    });

    this.logger.log('Booking processor started');
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
  }

  /**
   * Auto-cancel unpaid bookings after timeout
   */
  private async handleAutoCancel(job: any) {
    const { bookingId } = job.data;
    if (!bookingId) return;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: { select: { email: true, name: true } },
        hotel: { select: { name: true } },
        roomType: { select: { totalRooms: true } },
      },
    });

    if (!booking) return;

    // Only cancel if still pending payment
    if (booking.paymentStatus !== 'PENDING') {
      this.logger.debug(`Booking ${bookingId} already paid/cancelled, skipping auto-cancel`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      // Cancel the booking
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          paymentStatus: 'FAILED',
          cancellationReason: 'Payment timeout - auto cancelled',
          cancelledAt: new Date(),
        },
      });

      // Release inventory for daily bookings
      if (booking.bookingType === 'DAILY' && booking.checkOutDate) {
        const checkIn = new Date(booking.checkInDate);
        const checkOut = new Date(booking.checkOutDate);
        const oneDay = 24 * 60 * 60 * 1000;
        for (let d = checkIn; d < checkOut; d = new Date(d.getTime() + oneDay)) {
          await tx.roomInventory.updateMany({
            where: {
              roomTypeId: booking.roomTypeId,
              date: d,
            },
            data: {
              availableCount: { increment: booking.numRooms },
            },
          });
        }
      } else if (booking.bookingType === 'HOURLY') {
        // Release hourly slot
        if (booking.checkInTime) {
          await tx.hourlySlot.updateMany({
            where: {
              roomTypeId: booking.roomTypeId,
              date: booking.checkInDate,
              slotStart: booking.checkInTime,
            },
            data: {
              availableCount: { increment: booking.numRooms },
            },
          });
        }
      }
    });

    // Send cancellation email
    if (booking.guest.email) {
      await this.queueService.sendEmail({
        to: booking.guest.email,
        subject: `Booking #${booking.bookingNumber} Cancelled - Payment Timeout`,
        template: 'booking-cancellation',
        data: {
          guestName: booking.guest.name,
          bookingNumber: booking.bookingNumber,
          hotelName: booking.hotel.name,
        },
      });
    }

    this.logger.log(`Auto-cancelled booking ${booking.bookingNumber} due to payment timeout`);
  }

  /**
   * Send check-in reminder 1 day before
   */
  private async handleReminder(job: any) {
    const { bookingId } = job.data;
    if (!bookingId) return;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: { select: { email: true, name: true } },
        hotel: { select: { name: true, address: true, city: true, checkInTime: true } },
        roomType: { select: { name: true } },
      },
    });

    if (!booking || booking.status === 'CANCELLED') return;

    if (booking.guest.email) {
      await this.queueService.sendEmail({
        to: booking.guest.email,
        subject: `Reminder: Check-in tomorrow at ${booking.hotel.name}`,
        template: 'booking-confirmation',
        data: {
          guestName: booking.guest.name,
          hotelName: booking.hotel.name,
          bookingNumber: booking.bookingNumber,
          checkIn: new Date(booking.checkInDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
          checkOut: new Date(booking.checkOutDate || booking.checkInDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }),
          roomType: booking.roomType.name,
          amount: booking.totalAmount,
        },
      });
    }

    this.logger.log(`Check-in reminder sent for booking ${booking.bookingNumber}`);
  }

  /**
   * Send review request after checkout
   */
  private async handleReviewRequest(job: any) {
    const { bookingId } = job.data;
    if (!bookingId) return;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        guest: { select: { email: true, name: true } },
        hotel: { select: { name: true, slug: true } },
      },
    });

    if (!booking || booking.status === 'CANCELLED') return;

    // Check if review already exists
    const existingReview = await this.prisma.review.findFirst({
      where: { bookingId, guestId: booking.guestId },
    });

    if (existingReview) return;

    if (booking.guest.email) {
      await this.queueService.sendEmail({
        to: booking.guest.email,
        subject: `How was your stay at ${booking.hotel.name}?`,
        template: 'review-request',
        data: {
          guestName: booking.guest.name,
          hotelName: booking.hotel.name,
          reviewUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/booking/${bookingId}/review`,
        },
      });
    }

    this.logger.log(`Review request sent for booking ${booking.bookingNumber}`);
  }

  /**
   * Cleanup expired/unpaid bookings older than 1 hour
   */
  private async handleCleanupExpired(job: any) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    // Find expired bookings first so we can release their inventory
    const expiredBookings = await this.prisma.booking.findMany({
      where: {
        paymentStatus: 'PENDING',
        status: 'PENDING',
        createdAt: { lt: oneHourAgo },
      },
      select: {
        id: true,
        roomTypeId: true,
        numRooms: true,
        bookingType: true,
        checkInDate: true,
        checkOutDate: true,
        checkInTime: true,
      },
    });

    if (expiredBookings.length > 0) {
      await this.prisma.$transaction(async (tx) => {
        // Cancel all expired bookings
        await tx.booking.updateMany({
          where: { id: { in: expiredBookings.map((b) => b.id) } },
          data: {
            status: 'CANCELLED',
            paymentStatus: 'FAILED',
            cancellationReason: 'Expired - payment not completed',
            cancelledAt: new Date(),
          },
        });

        // Release inventory for each expired booking
        for (const booking of expiredBookings) {
          if (booking.bookingType === 'DAILY' && booking.checkOutDate) {
            const checkIn = new Date(booking.checkInDate);
            const checkOut = new Date(booking.checkOutDate);
            const oneDay = 24 * 60 * 60 * 1000;
            for (let d = checkIn; d < checkOut; d = new Date(d.getTime() + oneDay)) {
              await tx.roomInventory.updateMany({
                where: { roomTypeId: booking.roomTypeId, date: d },
                data: { availableCount: { increment: booking.numRooms } },
              });
            }
          }
        }
      });

      this.logger.log(`Cleaned up ${expiredBookings.length} expired bookings and released inventory`);
    }
  }
}
