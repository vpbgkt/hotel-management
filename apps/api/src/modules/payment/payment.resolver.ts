/**
 * Payment Resolver - Hotel Manager API
 * GraphQL mutations and queries for payment processing
 */

import { Resolver, Mutation, Query, Args, ID, ObjectType, Field, Float } from '@nestjs/graphql';
import { PaymentService } from './payment.service';
import { Payment } from '../booking/entities/booking.entity';

@ObjectType()
export class InitiatePaymentResult {
  @Field()
  paymentId: string;

  @Field()
  orderId: string;

  @Field(() => Float)
  amount: number;

  @Field()
  currency: string;

  @Field()
  gateway: string;

  @Field()
  bookingNumber: string;

  @Field({ nullable: true })
  gatewayData?: string; // JSON string of gateway-specific data
}

@ObjectType()
export class ConfirmPaymentResult {
  @Field()
  success: boolean;

  @Field()
  message: string;

  @Field({ nullable: true })
  bookingId?: string;

  @Field({ nullable: true })
  bookingNumber?: string;
}

@ObjectType()
export class RefundResult {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  refundId?: string;

  @Field(() => Float, { nullable: true })
  amount?: number;

  @Field()
  message: string;
}

@Resolver()
export class PaymentResolver {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Initiate payment for a booking
   * Returns gateway-specific data needed for frontend checkout
   */
  @Mutation(() => InitiatePaymentResult, {
    name: 'initiatePayment',
    description: 'Start payment process for a booking',
  })
  async initiatePayment(
    @Args('bookingId', { type: () => ID }) bookingId: string,
    @Args('method', { defaultValue: 'card' }) method: string,
  ): Promise<InitiatePaymentResult> {
    const result = await this.paymentService.initiatePayment(bookingId, method);
    return {
      ...result,
      gatewayData: result.gatewayData ? JSON.stringify(result.gatewayData) : undefined,
    };
  }

  /**
   * Confirm/verify a payment after gateway processing
   * For demo gateway this auto-approves
   */
  @Mutation(() => ConfirmPaymentResult, {
    name: 'confirmPayment',
    description: 'Confirm payment after gateway processing',
  })
  async confirmPayment(
    @Args('paymentId', { type: () => ID }) paymentId: string,
    @Args('gatewayPaymentId', { nullable: true }) gatewayPaymentId?: string,
    @Args('gatewaySignature', { nullable: true }) gatewaySignature?: string,
  ): Promise<ConfirmPaymentResult> {
    const result = await this.paymentService.confirmPayment(
      paymentId,
      gatewayPaymentId,
      gatewaySignature,
    );
    return {
      success: result.success,
      message: result.message,
      bookingId: result.bookingId,
      bookingNumber: result.bookingNumber,
    };
  }

  /**
   * Process refund for a booking
   */
  @Mutation(() => RefundResult, {
    name: 'processRefund',
    description: 'Process refund for a cancelled booking',
  })
  async processRefund(
    @Args('bookingId', { type: () => ID }) bookingId: string,
    @Args('amount', { type: () => Float, nullable: true }) amount?: number,
  ): Promise<RefundResult> {
    return this.paymentService.processRefund(bookingId, amount);
  }

  /**
   * Get payments for a booking
   */
  @Query(() => [Payment], {
    name: 'paymentsByBooking',
    description: 'Get all payments for a booking',
  })
  async getPaymentsByBooking(
    @Args('bookingId', { type: () => ID }) bookingId: string,
  ) {
    return this.paymentService.getPaymentsByBooking(bookingId);
  }
}
