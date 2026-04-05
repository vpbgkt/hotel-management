/**
 * Email Processor — Hotel Manager API
 * 
 * BullMQ worker that processes email jobs.
 * Only starts when Redis is enabled.
 */

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EmailJobData } from '../queue.service';
import * as nodemailer from 'nodemailer';

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
export class EmailProcessor implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EmailProcessor.name);
  private worker: any;
  private transporter: nodemailer.Transporter | null = null;

  async onModuleInit() {
    // Skip worker creation if Redis is disabled
    if (process.env.REDIS_ENABLED !== 'true' || !Worker) {
      this.logger.warn('Email processor skipped (Redis disabled)');
      return;
    }

    // Set up email transporter
    const smtpHost = process.env.SMTP_HOST;
    if (smtpHost) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    this.worker = new Worker(
      'email',
      async (job: any) => {
        await this.processEmail(job);
      },
      {
        connection: REDIS_CONNECTION,
        concurrency: 5,
        limiter: {
          max: 10,
          duration: 1000, // 10 emails per second max
        },
      },
    );

    this.worker.on('completed', (job: any) => {
      this.logger.debug(`Email sent: ${job.data.template} to ${job.data.to}`);
    });

    this.worker.on('failed', (job: any, err: any) => {
      this.logger.error(`Email failed: ${job?.data.template} to ${job?.data.to}: ${err.message}`);
    });

    this.logger.log('Email processor started');
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async processEmail(job: any) {
    const { to, subject, template, data } = job.data;

    const html = this.renderTemplate(template, data);

    if (this.transporter) {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || `${process.env.APP_NAME || 'Hotel'} <noreply@localhost>`,
        to,
        subject,
        html,
      });
    } else {
      // Dev mode: log email
      this.logger.log(`[DEV EMAIL] To: ${to} | Subject: ${subject} | Template: ${template}`);
    }
  }

  private renderTemplate(template: string, data: Record<string, any>): string {
    const brandColor = '#2563eb';
    
    const templates: Record<string, string> = {
      'booking-confirmation': `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${brandColor}; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0;">Booking Confirmed! ✓</h1>
          </div>
          <div style="padding: 24px;">
            <p>Dear ${data.guestName || 'Guest'},</p>
            <p>Your booking at <strong>${data.hotelName}</strong> has been confirmed.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Booking #</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.bookingNumber}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Check-in</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.checkIn}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Check-out</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.checkOut}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Room</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.roomType}</td></tr>
              <tr><td style="padding: 8px;"><strong>Amount</strong></td><td style="padding: 8px;">₹${data.amount?.toLocaleString('en-IN')}</td></tr>
            </table>
            <p>We look forward to hosting you!</p>
          </div>
          <div style="background: #f9fafb; padding: 16px; text-align: center; color: #6b7280; font-size: 12px;">
            Hotel Manager — Hotel Booking Platform
          </div>
        </div>
      `,
      'booking-cancellation': `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #dc2626; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0;">Booking Cancelled</h1>
          </div>
          <div style="padding: 24px;">
            <p>Dear ${data.guestName || 'Guest'},</p>
            <p>Your booking <strong>#${data.bookingNumber}</strong> at ${data.hotelName} has been cancelled.</p>
            ${data.refundAmount ? `<p>A refund of ₹${data.refundAmount.toLocaleString('en-IN')} will be processed within 5-7 business days.</p>` : ''}
          </div>
        </div>
      `,
      'welcome': `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${brandColor}; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0;">Welcome to Hotel Manager!</h1>
          </div>
          <div style="padding: 24px;">
            <p>Hi ${data.name || 'there'},</p>
            <p>Your account has been created successfully. Start exploring hotels and plan your next trip!</p>
          </div>
        </div>
      `,
      'review-request': `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${brandColor}; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0;">How was your stay?</h1>
          </div>
          <div style="padding: 24px;">
            <p>Hi ${data.guestName || 'there'},</p>
            <p>We hope you enjoyed your stay at <strong>${data.hotelName}</strong>. We'd love to hear your feedback!</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${data.reviewUrl || '#'}" style="background: ${brandColor}; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Leave a Review
              </a>
            </div>
          </div>
        </div>
      `,
      'password-reset': `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: ${brandColor}; color: white; padding: 24px; text-align: center;">
            <h1 style="margin: 0;">Reset Your Password</h1>
          </div>
          <div style="padding: 24px;">
            <p>You requested a password reset. Use this OTP to reset your password:</p>
            <div style="text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: ${brandColor};">${data.otp}</span>
            </div>
            <p>This OTP expires in 10 minutes.</p>
          </div>
        </div>
      `,
    };

    return templates[template] || `<p>${JSON.stringify(data)}</p>`;
  }
}
