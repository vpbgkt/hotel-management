/**
 * Payment Module - Hotel Manager API
 * Manages payment processing for Indian clients.
 * Uses Razorpay as the primary gateway (UPI, Cards, Net Banking, Wallets).
 * Falls back to DEMO gateway when Razorpay credentials are not configured.
 */

import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentResolver } from './payment.resolver';
import { PaymentController } from './payment.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymentController],
  providers: [PaymentService, PaymentResolver],
  exports: [PaymentService],
})
export class PaymentModule {}
