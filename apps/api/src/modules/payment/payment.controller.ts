/**
 * Payment Controller - Hotel Manager API
 * 
 * REST endpoints for payment-related callbacks and webhooks.
 * Razorpay sends server-to-server webhook events for payment lifecycle:
 *   - payment.captured → mark payment as captured, booking confirmed
 *   - payment.failed   → mark payment as failed
 *   - refund.processed → update refund status
 * 
 * Webhook signature is verified via HMAC SHA256 using the webhook secret.
 */

import {
  Controller,
  Post,
  Req,
  Res,
  Headers,
  HttpCode,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Controller('webhooks')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);
  private readonly webhookSecret: string;

  constructor(private readonly prisma: PrismaService) {
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET || '';
  }

  /**
   * Razorpay Webhook Handler
   * POST /api/webhooks/razorpay
   * 
   * Razorpay sends events as JSON with X-Razorpay-Signature header.
   * Signature = HMAC SHA256 of raw body using webhook secret.
   */
  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    // Get raw body for signature verification
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    // Verify webhook signature
    if (!this.verifySignature(rawBody, signature)) {
      this.logger.warn('Razorpay webhook signature verification failed');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventType = event?.event as string;
    const payload = event?.payload;

    this.logger.log(`Razorpay webhook received: ${eventType}`);

    try {
      switch (eventType) {
        case 'payment.captured':
          await this.handlePaymentCaptured(payload);
          break;

        case 'payment.failed':
          await this.handlePaymentFailed(payload);
          break;

        case 'refund.processed':
          await this.handleRefundProcessed(payload);
          break;

        case 'payment.authorized':
          // For auto-capture, we just log. Capture happens automatically.
          this.logger.log(`Payment authorized: ${payload?.payment?.entity?.id}`);
          break;

        default:
          this.logger.debug(`Unhandled Razorpay event: ${eventType}`);
      }

      return res.json({ status: 'ok' });
    } catch (err) {
      this.logger.error(`Webhook processing error for ${eventType}: ${err.message}`, err.stack);
      // Return 200 anyway so Razorpay doesn't retry endlessly
      return res.json({ status: 'ok', warning: 'Processing error logged' });
    }
  }

  /**
   * Handle payment.captured event
   * Updates payment to CAPTURED and booking to CONFIRMED + PAID
   */
  private async handlePaymentCaptured(payload: any) {
    const paymentEntity = payload?.payment?.entity;
    if (!paymentEntity) return;

    const razorpayOrderId = paymentEntity.order_id;
    const razorpayPaymentId = paymentEntity.id;
    const amountPaise = paymentEntity.amount;

    // Find payment by gateway order ID
    const payment = await this.prisma.payment.findFirst({
      where: { gatewayOrderId: razorpayOrderId },
      include: { booking: true },
    });

    if (!payment) {
      this.logger.warn(`No payment found for Razorpay order: ${razorpayOrderId}`);
      return;
    }

    // Idempotent: skip if already captured
    if (payment.status === 'CAPTURED') {
      this.logger.debug(`Payment ${payment.id} already captured, skipping`);
      return;
    }

    // Update payment and booking in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'CAPTURED',
          gatewayPaymentId: razorpayPaymentId,
          metadata: {
            ...(payment.metadata as Record<string, any> || {}),
            webhookCapturedAt: new Date().toISOString(),
            amountPaise,
            method: paymentEntity.method,
            bank: paymentEntity.bank,
            wallet: paymentEntity.wallet,
            vpa: paymentEntity.vpa,
          },
        },
      });

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
        },
      });
    });

    this.logger.log(
      `Payment captured via webhook: ${payment.id} (Razorpay: ${razorpayPaymentId}) for booking ${payment.booking.bookingNumber}`,
    );
  }

  /**
   * Handle payment.failed event
   * Marks payment and booking payment status as FAILED
   */
  private async handlePaymentFailed(payload: any) {
    const paymentEntity = payload?.payment?.entity;
    if (!paymentEntity) return;

    const razorpayOrderId = paymentEntity.order_id;
    const errorCode = paymentEntity.error_code;
    const errorDescription = paymentEntity.error_description;

    const payment = await this.prisma.payment.findFirst({
      where: { gatewayOrderId: razorpayOrderId },
      include: { booking: true },
    });

    if (!payment) {
      this.logger.warn(`No payment found for failed Razorpay order: ${razorpayOrderId}`);
      return;
    }

    // Idempotent: skip if already marked failed or captured
    if (payment.status === 'FAILED' || payment.status === 'CAPTURED') {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'FAILED',
          metadata: {
            ...(payment.metadata as Record<string, any> || {}),
            errorCode,
            errorDescription,
            failedAt: new Date().toISOString(),
          },
        },
      });

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: 'FAILED' },
      });
    });

    this.logger.log(
      `Payment failed via webhook: ${payment.id} for booking ${payment.booking.bookingNumber} - ${errorCode}: ${errorDescription}`,
    );
  }

  /**
   * Handle refund.processed event
   * Updates payment refund status
   */
  private async handleRefundProcessed(payload: any) {
    const refundEntity = payload?.refund?.entity;
    if (!refundEntity) return;

    const razorpayPaymentId = refundEntity.payment_id;
    const refundAmount = refundEntity.amount / 100; // Convert from paise to INR

    const payment = await this.prisma.payment.findFirst({
      where: { gatewayPaymentId: razorpayPaymentId },
      include: { booking: true },
    });

    if (!payment) {
      this.logger.warn(`No payment found for refund on Razorpay payment: ${razorpayPaymentId}`);
      return;
    }

    const totalRefunded = (payment.refundAmount || 0) + refundAmount;
    const isFullRefund = totalRefunded >= payment.amount;

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: isFullRefund ? 'REFUNDED' : 'CAPTURED',
          refundAmount: totalRefunded,
          refundId: refundEntity.id,
          metadata: {
            ...(payment.metadata as Record<string, any> || {}),
            lastRefundAt: new Date().toISOString(),
            refundSpeed: refundEntity.speed,
          },
        },
      });

      await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          paymentStatus: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
        },
      });
    });

    this.logger.log(
      `Refund processed via webhook: ₹${refundAmount} for payment ${payment.id} (booking ${payment.booking.bookingNumber})`,
    );
  }

  /**
   * Verify Razorpay webhook signature
   * Razorpay signs the raw request body with HMAC SHA256
   */
  private verifySignature(rawBody: string, signature: string): boolean {
    if (!signature || !this.webhookSecret) {
      this.logger.warn('Missing webhook signature or secret');
      return false;
    }

    const expectedSignature = createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    return expectedSignature === signature;
  }
}
