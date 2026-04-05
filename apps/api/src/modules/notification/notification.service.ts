import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as nodemailer from 'nodemailer';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export type NotificationType =
  | 'BOOKING_CONFIRMED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_CHECKED_IN'
  | 'BOOKING_CHECKED_OUT'
  | 'REVIEW_SUBMITTED'
  | 'REVIEW_REPLY'
  | 'HOTEL_ACTIVATED'
  | 'HOTEL_ONBOARDED';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromAddress: string;

  constructor(private readonly prisma: PrismaService) {
    this.fromAddress = process.env.SMTP_FROM || `${process.env.APP_NAME || 'Hotel'} <noreply@localhost>`;
  }

  onModuleInit() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '587', 10),
        secure: (smtpPort || '587') === '465',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      this.logger.log(`📧 SMTP configured: ${smtpHost}:${smtpPort || 587}`);
    } else {
      this.logger.warn('📧 SMTP not configured — emails will be logged only. Set SMTP_HOST, SMTP_USER, SMTP_PASS env vars.');
    }
  }

  /**
   * Send a notification email.
   * Uses SMTP if configured, otherwise logs the email for development.
   */
  async sendEmail(payload: EmailPayload): Promise<boolean> {
    try {
      if (this.transporter) {
        await this.transporter.sendMail({
          from: this.fromAddress,
          to: payload.to,
          subject: payload.subject,
          html: payload.html,
          text: payload.text,
        });
        this.logger.log(`📧 Email sent to: ${payload.to} | Subject: ${payload.subject}`);
      } else {
        // Dev mode: log the email
        this.logger.log(`📧 [DEV] Email to: ${payload.to}`);
        this.logger.log(`   Subject: ${payload.subject}`);
        this.logger.debug(`   Body: ${payload.html.substring(0, 200)}...`);
      }
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${payload.to}`, error);
      return false;
    }
  }

  /**
   * Send booking confirmation to guest
   */
  async notifyBookingConfirmed(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hotel: { select: { name: true, phone: true, email: true, address: true, city: true } },
        roomType: { select: { name: true } },
      },
    });

    if (!booking) return;

    const checkin = new Date(booking.checkInDate).toLocaleDateString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const checkout = booking.checkOutDate
      ? new Date(booking.checkOutDate).toLocaleDateString('en-IN', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'N/A';

    await this.sendEmail({
      to: booking.guestEmail,
      subject: `Booking Confirmed - ${booking.bookingNumber} | ${booking.hotel.name}`,
      html: this.bookingConfirmationTemplate({
        guestName: booking.guestName,
        bookingNumber: booking.bookingNumber,
        hotelName: booking.hotel.name,
        roomType: booking.roomType.name,
        checkIn: checkin,
        checkOut: checkout,
        totalAmount: booking.totalAmount,
        numRooms: booking.numRooms,
        hotelAddress: `${booking.hotel.address}, ${booking.hotel.city}`,
        hotelPhone: booking.hotel.phone || '',
      }),
    });
  }

  /**
   * Send booking cancellation to guest
   */
  async notifyBookingCancelled(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hotel: { select: { name: true } },
      },
    });

    if (!booking) return;

    await this.sendEmail({
      to: booking.guestEmail,
      subject: `Booking Cancelled - ${booking.bookingNumber}`,
      html: this.bookingCancellationTemplate({
        guestName: booking.guestName,
        bookingNumber: booking.bookingNumber,
        hotelName: booking.hotel.name,
        totalAmount: booking.totalAmount,
      }),
    });
  }

  /**
   * Send review prompt after checkout
   */
  async notifyCheckoutReviewPrompt(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hotel: { select: { name: true, slug: true } },
      },
    });

    if (!booking) return;

    await this.sendEmail({
      to: booking.guestEmail,
      subject: `How was your stay at ${booking.hotel.name}?`,
      html: this.reviewPromptTemplate({
        guestName: booking.guestName,
        hotelName: booking.hotel.name,
        bookingId: booking.id,
      }),
    });
  }

  /**
   * Notify hotel admin of new review
   */
  async notifyNewReview(reviewId: string) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        hotel: {
          select: {
            name: true,
            email: true,
          },
        },
        guest: { select: { name: true } },
      },
    });

    if (!review || !review.hotel.email) return;

    await this.sendEmail({
      to: review.hotel.email,
      subject: `New ${review.rating}-star review from ${review.guest.name}`,
      html: this.newReviewTemplate({
        hotelName: review.hotel.name,
        guestName: review.guest.name,
        rating: review.rating,
        comment: review.comment || 'No comment',
      }),
    });
  }

  /**
   * Notify hotel that it has been activated by platform admin
   */
  async notifyHotelActivated(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { name: true, email: true, slug: true },
    });

    if (!hotel?.email) return;

    await this.sendEmail({
      to: hotel.email,
      subject: `Your hotel ${hotel.name} is now live on Hotel Manager!`,
      html: this.hotelActivatedTemplate({
        hotelName: hotel.name,
        hotelSlug: hotel.slug,
      }),
    });
  }

  // ============================================
  // Auth Email Methods
  // ============================================

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, name: string, token: string) {
    const resetUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/auth/reset-password?token=${encodeURIComponent(token)}`;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Hotel Manager',
      html: this.passwordResetTemplate({ name, resetUrl }),
    });
  }

  /**
   * Send email verification link
   */
  async sendEmailVerification(email: string, name: string, token: string) {
    const verifyUrl = `${process.env.WEB_URL || 'http://localhost:3000'}/auth/verify-email?token=${encodeURIComponent(token)}`;

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - Hotel Manager',
      html: this.emailVerificationTemplate({ name, verifyUrl }),
    });
  }

  // ============================================
  // Email Templates
  // ============================================

  private bookingConfirmationTemplate(data: {
    guestName: string;
    bookingNumber: string;
    hotelName: string;
    roomType: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    numRooms: number;
    hotelAddress: string;
    hotelPhone: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #2563eb; border-radius: 12px 12px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Booking Confirmed ✅</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">${data.bookingNumber}</p>
    </div>
    <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px;">
      <p style="color: #374151; font-size: 16px;">Hi ${data.guestName},</p>
      <p style="color: #6b7280;">Your booking at <strong>${data.hotelName}</strong> has been confirmed.</p>

      <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Room Type</td><td style="padding: 6px 0; text-align: right; font-weight: 600; font-size: 14px;">${data.roomType} × ${data.numRooms}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Check-in</td><td style="padding: 6px 0; text-align: right; font-weight: 600; font-size: 14px;">${data.checkIn}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Check-out</td><td style="padding: 6px 0; text-align: right; font-weight: 600; font-size: 14px;">${data.checkOut}</td></tr>
          <tr style="border-top: 1px solid #e5e7eb;"><td style="padding: 12px 0 6px; color: #374151; font-weight: 700;">Total</td><td style="padding: 12px 0 6px; text-align: right; font-weight: 700; font-size: 18px; color: #2563eb;">₹${data.totalAmount.toLocaleString('en-IN')}</td></tr>
        </table>
      </div>

      <div style="background: #eff6ff; border-radius: 8px; padding: 16px; margin: 20px 0;">
        <p style="color: #1e40af; font-weight: 600; margin: 0 0 4px; font-size: 14px;">${data.hotelName}</p>
        <p style="color: #3b82f6; margin: 0; font-size: 13px;">${data.hotelAddress}</p>
        ${data.hotelPhone ? `<p style="color: #3b82f6; margin: 4px 0 0; font-size: 13px;">📞 ${data.hotelPhone}</p>` : ''}
      </div>

      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
        This is an automated email. Please do not reply.
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  private bookingCancellationTemplate(data: {
    guestName: string;
    bookingNumber: string;
    hotelName: string;
    totalAmount: number;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #dc2626; border-radius: 12px 12px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Booking Cancelled</h1>
      <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">${data.bookingNumber}</p>
    </div>
    <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px;">
      <p>Hi ${data.guestName},</p>
      <p style="color: #6b7280;">Your booking at <strong>${data.hotelName}</strong> (₹${data.totalAmount.toLocaleString('en-IN')}) has been cancelled.</p>
      <p style="color: #6b7280;">If you paid online, a refund will be processed within 5-7 business days.</p>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">Hotel Manager</p>
    </div>
  </div>
</body>
</html>`;
  }

  private reviewPromptTemplate(data: {
    guestName: string;
    hotelName: string;
    bookingId: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border-radius: 12px; padding: 32px; text-align: center;">
      <p style="font-size: 48px; margin: 0;">⭐</p>
      <h1 style="color: #111827; margin: 16px 0 8px; font-size: 22px;">How was your stay?</h1>
      <p style="color: #6b7280; margin: 0 0 20px;">Hi ${data.guestName}, we hope you enjoyed your stay at <strong>${data.hotelName}</strong>.</p>
      <p style="color: #6b7280;">Your feedback helps other travelers and the hotel improve. Share your experience!</p>
      <a href="${process.env.WEB_URL || 'http://localhost:3000'}/dashboard/bookings" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px;">Write a Review</a>
      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Hotel Manager</p>
    </div>
  </div>
</body>
</html>`;
  }

  private newReviewTemplate(data: {
    hotelName: string;
    guestName: string;
    rating: number;
    comment: string;
  }): string {
    const stars = '⭐'.repeat(data.rating);
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; border-radius: 12px; padding: 32px;">
      <h1 style="color: #111827; font-size: 20px; margin: 0 0 16px;">New Review for ${data.hotelName}</h1>
      <p style="margin: 0 0 8px;">${stars} (${data.rating}/5)</p>
      <p style="color: #374151; font-weight: 600;">${data.guestName}</p>
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="color: #6b7280; margin: 0; font-style: italic;">"${data.comment}"</p>
      </div>
      <p style="color: #6b7280; font-size: 14px;">Log in to your admin dashboard to respond to this review.</p>
    </div>
  </div>
</body>
</html>`;
  }

  private hotelActivatedTemplate(data: {
    hotelName: string;
    hotelSlug: string;
  }): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #059669; border-radius: 12px 12px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🎉 You're Live!</h1>
    </div>
    <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px;">
      <p>Congratulations! <strong>${data.hotelName}</strong> is now active on Hotel Manager.</p>
      <p style="color: #6b7280;">Your hotel is now visible to thousands of travelers. Here's what to do next:</p>
      <ol style="color: #374151; line-height: 1.8;">
        <li>Add your room types and pricing</li>
        <li>Upload photos and descriptions</li>
        <li>Configure your availability calendar</li>
        <li>Set up your SEO metadata</li>
      </ol>
      <a href="${process.env.WEB_URL || 'http://localhost:3000'}/admin" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 12px;">Go to Dashboard</a>
    </div>
  </div>
</body>
</html>`;
  }

  private passwordResetTemplate(data: { name: string; resetUrl: string }): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #2563eb; border-radius: 12px 12px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
    </div>
    <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px;">
      <p>Hi ${data.name},</p>
      <p style="color: #6b7280;">We received a request to reset your password. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset Password</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">Hotel Manager</p>
    </div>
  </div>
</body>
</html>`;
  }

  private emailVerificationTemplate(data: { name: string; verifyUrl: string }): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 0; padding: 0; background: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #059669; border-radius: 12px 12px 0 0; padding: 32px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">Verify Your Email</h1>
    </div>
    <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px;">
      <p>Hi ${data.name},</p>
      <p style="color: #6b7280;">Thanks for signing up! Please verify your email address by clicking the button below:</p>
      <div style="text-align: center; margin: 24px 0;">
        <a href="${data.verifyUrl}" style="display: inline-block; background: #059669; color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: 600;">Verify Email</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours.</p>
      <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">Hotel Manager</p>
    </div>
  </div>
</body>
</html>`;
  }
}
