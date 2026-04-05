/**
 * SMS Service - Hotel Manager API
 *
 * Sends SMS and WhatsApp messages via MSG91 (India).
 * Supports OTP delivery, booking confirmations, and notifications.
 *
 * Required env vars:
 *   MSG91_AUTH_KEY     - MSG91 authentication key
 *   MSG91_SENDER_ID    - 6-char sender ID (e.g., "BLUSTY")
 *   MSG91_TEMPLATE_ID  - Default template ID for OTP
 *   MSG91_WHATSAPP_FROM - WhatsApp-approved sender ID
 */

import { Injectable, Logger } from '@nestjs/common';

interface SMSOptions {
  to: string; // Phone number with country code (e.g., "919876543210")
  message: string;
  templateId?: string;
  variables?: Record<string, string>;
}

interface WhatsAppOptions {
  to: string;
  templateName: string;
  variables?: string[];
  mediaUrl?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly authKey: string;
  private readonly senderId: string;
  private readonly defaultTemplateId: string;
  private readonly whatsappFrom: string;
  private readonly isConfigured: boolean;

  constructor() {
    this.authKey = process.env.MSG91_AUTH_KEY || '';
    this.senderId = process.env.MSG91_SENDER_ID || 'BLUSTY';
    this.defaultTemplateId = process.env.MSG91_TEMPLATE_ID || '';
    this.whatsappFrom = process.env.MSG91_WHATSAPP_FROM || '';
    this.isConfigured = !!this.authKey;

    if (!this.isConfigured) {
      this.logger.warn('MSG91 auth key not set — SMS/WhatsApp will be logged only');
    }
  }

  // ============================================
  // SMS
  // ============================================

  /**
   * Send an SMS via MSG91 Flow API
   */
  async sendSMS(options: SMSOptions): Promise<boolean> {
    const phone = this.normalizePhone(options.to);

    if (!this.isConfigured) {
      this.logger.log(`[SMS DRY RUN] To: ${phone}, Message: ${options.message}`);
      return true;
    }

    try {
      const response = await fetch('https://control.msg91.com/api/v5/flow/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: this.authKey,
        },
        body: JSON.stringify({
          template_id: options.templateId || this.defaultTemplateId,
          sender: this.senderId,
          short_url: '0',
          mobiles: phone,
          ...options.variables,
        }),
      });

      const data = await response.json();
      if (data.type === 'success') {
        this.logger.log(`SMS sent to ${phone}`);
        return true;
      }

      this.logger.error(`SMS failed: ${JSON.stringify(data)}`);
      return false;
    } catch (error) {
      this.logger.error(`SMS send error: ${error}`);
      return false;
    }
  }

  /**
   * Send OTP via MSG91
   */
  async sendOTP(phone: string, otp: string): Promise<boolean> {
    const normalizedPhone = this.normalizePhone(phone);

    if (!this.isConfigured) {
      this.logger.log(`[OTP DRY RUN] To: ${normalizedPhone}, OTP: ${otp}`);
      return true;
    }

    try {
      const response = await fetch('https://control.msg91.com/api/v5/otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          authkey: this.authKey,
        },
        body: JSON.stringify({
          template_id: this.defaultTemplateId,
          mobile: normalizedPhone,
          otp,
          otp_length: 6,
          otp_expiry: 5, // minutes
        }),
      });

      const data = await response.json();
      if (data.type === 'success') {
        this.logger.log(`OTP sent to ${normalizedPhone}`);
        return true;
      }

      this.logger.error(`OTP send failed: ${JSON.stringify(data)}`);
      return false;
    } catch (error) {
      this.logger.error(`OTP send error: ${error}`);
      return false;
    }
  }

  /**
   * Send booking confirmation SMS
   */
  async sendBookingConfirmation(params: {
    phone: string;
    guestName: string;
    bookingNumber: string;
    hotelName: string;
    checkInDate: string;
    totalAmount: number;
  }): Promise<boolean> {
    return this.sendSMS({
      to: params.phone,
      message: `Dear ${params.guestName}, your booking ${params.bookingNumber} at ${params.hotelName} is confirmed. Check-in: ${params.checkInDate}. Total: ₹${params.totalAmount}. - Hotel Manager`,
      variables: {
        VAR1: params.guestName,
        VAR2: params.bookingNumber,
        VAR3: params.hotelName,
        VAR4: params.checkInDate,
        VAR5: params.totalAmount.toString(),
      },
    });
  }

  /**
   * Send booking cancellation SMS
   */
  async sendBookingCancellation(params: {
    phone: string;
    guestName: string;
    bookingNumber: string;
    hotelName: string;
    refundAmount?: number;
  }): Promise<boolean> {
    const refundMsg = params.refundAmount
      ? ` Refund of ₹${params.refundAmount} will be processed.`
      : '';

    return this.sendSMS({
      to: params.phone,
      message: `Dear ${params.guestName}, your booking ${params.bookingNumber} at ${params.hotelName} has been cancelled.${refundMsg} - Hotel Manager`,
      variables: {
        VAR1: params.guestName,
        VAR2: params.bookingNumber,
        VAR3: params.hotelName,
      },
    });
  }

  // ============================================
  // WhatsApp via MSG91
  // ============================================

  /**
   * Send WhatsApp message via MSG91
   */
  async sendWhatsApp(options: WhatsAppOptions): Promise<boolean> {
    const phone = this.normalizePhone(options.to);

    if (!this.isConfigured || !this.whatsappFrom) {
      this.logger.log(
        `[WhatsApp DRY RUN] To: ${phone}, Template: ${options.templateName}`,
      );
      return true;
    }

    try {
      const body: any = {
        integrated_number: this.whatsappFrom,
        content_type: 'template',
        payload: {
          to: phone,
          type: 'template',
          template: {
            name: options.templateName,
            language: { code: 'en', policy: 'deterministic' },
            components: [],
          },
        },
      };

      // Add template variables
      if (options.variables?.length) {
        body.payload.template.components.push({
          type: 'body',
          parameters: options.variables.map((v) => ({
            type: 'text',
            text: v,
          })),
        });
      }

      // Add media header if provided
      if (options.mediaUrl) {
        body.payload.template.components.push({
          type: 'header',
          parameters: [
            {
              type: 'image',
              image: { link: options.mediaUrl },
            },
          ],
        });
      }

      const response = await fetch(
        'https://control.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            authkey: this.authKey,
          },
          body: JSON.stringify(body),
        },
      );

      const data = await response.json();
      if (response.ok) {
        this.logger.log(`WhatsApp sent to ${phone}`);
        return true;
      }

      this.logger.error(`WhatsApp failed: ${JSON.stringify(data)}`);
      return false;
    } catch (error) {
      this.logger.error(`WhatsApp send error: ${error}`);
      return false;
    }
  }

  /**
   * Send booking confirmation on WhatsApp
   */
  async sendBookingConfirmationWhatsApp(params: {
    phone: string;
    guestName: string;
    bookingNumber: string;
    hotelName: string;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: number;
    invoiceUrl?: string;
  }): Promise<boolean> {
    return this.sendWhatsApp({
      to: params.phone,
      templateName: 'booking_confirmation',
      variables: [
        params.guestName,
        params.bookingNumber,
        params.hotelName,
        params.checkInDate,
        params.checkOutDate,
        `₹${params.totalAmount}`,
      ],
      mediaUrl: params.invoiceUrl,
    });
  }

  /**
   * Send check-in reminder on WhatsApp
   */
  async sendCheckInReminderWhatsApp(params: {
    phone: string;
    guestName: string;
    hotelName: string;
    checkInDate: string;
    checkInTime: string;
    hotelAddress: string;
  }): Promise<boolean> {
    return this.sendWhatsApp({
      to: params.phone,
      templateName: 'checkin_reminder',
      variables: [
        params.guestName,
        params.hotelName,
        params.checkInDate,
        params.checkInTime,
        params.hotelAddress,
      ],
    });
  }

  // ============================================
  // Helpers
  // ============================================

  /**
   * Normalize phone to include country code (default: India +91)
   */
  private normalizePhone(phone: string): string {
    // Remove non-digit characters
    const digits = phone.replace(/\D/g, '');

    // If it's a 10-digit Indian number, prepend 91
    if (digits.length === 10 && /^[6-9]/.test(digits)) {
      return `91${digits}`;
    }

    // If it already has country code
    if (digits.length > 10) {
      return digits;
    }

    return digits;
  }
}
