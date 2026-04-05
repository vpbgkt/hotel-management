/**
 * Payment Service - Hotel Manager API
 *
 * Payment service supporting Razorpay and Demo gateways.
 * Architecture: Uses a strategy pattern — DemoGateway for dev/testing,
 * RazorpayGateway for production (Indian payments — UPI, Cards, Net Banking, Wallets).
 *
 * Gateway priority for Indian clients: Razorpay → Demo
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID, createHmac } from 'crypto';
import Razorpay from 'razorpay';

export interface PaymentGatewayInterface {
  readonly name: string;
  
  createOrder(amount: number, currency: string, metadata?: Record<string, any>): Promise<{
    orderId: string;
    amount: number;
    currency: string;
    gatewayData?: Record<string, any>;
  }>;
  
  verifyPayment(paymentId: string, orderId: string, signature?: string): Promise<{
    verified: boolean;
    gatewayPaymentId: string;
    status: string;
  }>;
  
  processRefund(paymentId: string, amount: number): Promise<{
    refundId: string;
    amount: number;
    status: string;
  }>;
}

/**
 * Demo Payment Gateway
 * Simulates payment processing for development/testing.
 * All payments auto-approve after a brief delay.
 */
class DemoGateway implements PaymentGatewayInterface {
  readonly name = 'DEMO';

  async createOrder(amount: number, currency: string, metadata?: Record<string, any>) {
    const orderId = `demo_order_${randomUUID().slice(0, 12)}`;
    return {
      orderId,
      amount,
      currency,
      gatewayData: {
        gateway: 'DEMO',
        mode: 'test',
        message: 'Demo payment - auto-approves all transactions',
        ...metadata,
      },
    };
  }

  async verifyPayment(paymentId: string, orderId: string) {
    return {
      verified: true,
      gatewayPaymentId: paymentId || `demo_pay_${randomUUID().slice(0, 12)}`,
      status: 'CAPTURED',
    };
  }

  async processRefund(paymentId: string, amount: number) {
    return {
      refundId: `demo_refund_${randomUUID().slice(0, 12)}`,
      amount,
      status: 'REFUNDED',
    };
  }
}

/**
 * Razorpay Payment Gateway
 * Real payment processing for Indian payments.
 * Supports UPI, Cards, Net Banking, Wallets via Razorpay Checkout.
 * Amounts are in paise (1 INR = 100 paise).
 */
class RazorpayGateway implements PaymentGatewayInterface {
  readonly name = 'RAZORPAY';
  private razorpay: InstanceType<typeof Razorpay>;
  private keyId: string;
  private keySecret: string;

  constructor() {
    this.keyId = process.env.RAZORPAY_KEY_ID || '';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  async createOrder(amount: number, currency: string, metadata?: Record<string, any>) {
    const amountInPaise = Math.round(amount * 100);
    const receipt = `rcpt_${randomUUID().slice(0, 12)}`;

    const order = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: currency || 'INR',
      receipt,
      notes: metadata ? {
        bookingId: metadata.bookingId || '',
        bookingNumber: metadata.bookingNumber || '',
        hotelName: metadata.hotelName || '',
      } : undefined,
    });

    return {
      orderId: order.id,
      amount,
      currency: order.currency,
      gatewayData: {
        gateway: 'RAZORPAY',
        razorpayKeyId: this.keyId,
        razorpayOrderId: order.id,
        amount: amountInPaise,
        currency: order.currency,
        name: metadata?.hotelName || 'Hotel Manager',
        description: `Booking ${metadata?.bookingNumber || ''}`,
        prefill: metadata?.prefill || {},
      },
    };
  }

  async verifyPayment(paymentId: string, orderId: string, signature?: string) {
    if (!signature) {
      return { verified: false, gatewayPaymentId: paymentId, status: 'FAILED' };
    }

    // Razorpay signature verification: HMAC SHA256 of "orderId|paymentId"
    const expectedSignature = createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const verified = expectedSignature === signature;

    return {
      verified,
      gatewayPaymentId: paymentId,
      status: verified ? 'CAPTURED' : 'FAILED',
    };
  }

  async processRefund(paymentId: string, amount: number) {
    const amountInPaise = Math.round(amount * 100);

    const refund = await this.razorpay.payments.refund(paymentId, {
      amount: amountInPaise,
    });

    return {
      refundId: refund.id,
      amount,
      status: refund.status === 'processed' ? 'REFUNDED' : 'PENDING',
    };
  }
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private gateway: PaymentGatewayInterface;

  constructor(private readonly prisma: PrismaService) {
    // Gateway selection for Indian clients: Razorpay → Demo
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.gateway = new RazorpayGateway();
      this.logger.log('Payment service initialized with RAZORPAY gateway');
    } else {
      this.gateway = new DemoGateway();
      this.logger.log('Payment service initialized with DEMO gateway (set RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET for real payments)');
    }
  }

  /**
   * Initiate a payment for a booking
   */
  async initiatePayment(bookingId: string, method: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        hotel: { select: { id: true, name: true } },
        roomType: { select: { id: true, name: true } },
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.paymentStatus === 'PAID') {
      throw new BadRequestException('This booking has already been paid');
    }

    // Create order with the gateway
    const order = await this.gateway.createOrder(
      booking.totalAmount,
      'INR',
      {
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        hotelName: booking.hotel.name,
        roomType: booking.roomType.name,
      }
    );

    // Create payment record
    const payment = await this.prisma.payment.create({
      data: {
        bookingId: booking.id,
        gateway: this.gateway.name as any,
        gatewayOrderId: order.orderId,
        amount: booking.totalAmount,
        currency: 'INR',
        status: 'CREATED',
        metadata: order.gatewayData as any,
      },
    });

    this.logger.log(`Payment initiated for booking ${booking.bookingNumber}: ${payment.id} via ${this.gateway.name}`);

    return {
      paymentId: payment.id,
      orderId: order.orderId,
      amount: booking.totalAmount,
      currency: 'INR',
      gateway: this.gateway.name,
      bookingNumber: booking.bookingNumber,
      gatewayData: order.gatewayData,
    };
  }

  /**
   * Confirm/verify a payment and update booking status
   */
  async confirmPayment(
    paymentId: string, 
    gatewayPaymentId?: string, 
    gatewaySignature?: string
  ) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (payment.status === 'CAPTURED') {
      return {
        success: true,
        message: 'Payment already confirmed',
        bookingId: payment.bookingId,
        bookingNumber: payment.booking.bookingNumber,
      };
    }

    // Verify with gateway
    const verification = await this.gateway.verifyPayment(
      gatewayPaymentId || `demo_pay_${randomUUID().slice(0, 8)}`,
      payment.gatewayOrderId || '',
      gatewaySignature
    );

    if (!verification.verified) {
      // Mark payment as failed
      await this.prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED' },
      });

      await this.prisma.booking.update({
        where: { id: payment.bookingId },
        data: { paymentStatus: 'FAILED' },
      });

      return {
        success: false,
        message: 'Payment verification failed',
        bookingId: payment.bookingId,
      };
    }

    // Update payment and booking in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update payment
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: 'CAPTURED',
          gatewayPaymentId: verification.gatewayPaymentId,
          metadata: {
            ...(payment.metadata as Record<string, any> || {}),
            verifiedAt: new Date().toISOString(),
          },
        },
      });

      // Update booking
      const updatedBooking = await tx.booking.update({
        where: { id: payment.bookingId },
        data: {
          paymentStatus: 'PAID',
          status: 'CONFIRMED',
        },
        include: {
          hotel: {
            select: { id: true, name: true, slug: true, address: true, city: true, phone: true },
          },
          roomType: {
            select: { id: true, name: true, slug: true, images: true },
          },
        },
      });

      return updatedBooking;
    });

    this.logger.log(`Payment confirmed for booking ${payment.booking.bookingNumber}`);

    return {
      success: true,
      message: 'Payment confirmed. Booking is now confirmed.',
      bookingId: result.id,
      bookingNumber: result.bookingNumber,
      booking: result,
    };
  }

  /**
   * Process refund for a cancelled booking
   */
  async processRefund(bookingId: string, amount?: number) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payments: true },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    const capturedPayment = booking.payments.find(p => p.status === 'CAPTURED');
    if (!capturedPayment) {
      throw new BadRequestException('No captured payment found for this booking');
    }

    const refundAmount = amount ?? booking.totalAmount;

    const refundResult = await this.gateway.processRefund(
      capturedPayment.gatewayPaymentId || '',
      refundAmount
    );

    // Update payment record
    await this.prisma.payment.update({
      where: { id: capturedPayment.id },
      data: {
        status: refundAmount >= booking.totalAmount ? 'REFUNDED' : 'CAPTURED',
        refundAmount: { increment: refundAmount },
        refundId: refundResult.refundId,
      },
    });

    // Update booking
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        paymentStatus: refundAmount >= booking.totalAmount ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
      },
    });

    this.logger.log(`Refund processed for booking ${booking.bookingNumber}: ₹${refundAmount}`);

    return {
      success: true,
      refundId: refundResult.refundId,
      amount: refundAmount,
      message: `Refund of ₹${refundAmount} processed successfully`,
    };
  }

  /**
   * Get payment by ID
   */
  async getPaymentById(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: { booking: true },
    });
  }

  /**
   * Get payments for a booking
   */
  async getPaymentsByBooking(bookingId: string) {
    return this.prisma.payment.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
