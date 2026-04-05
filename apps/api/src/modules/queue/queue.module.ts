/**
 * Queue Module - Hotel Manager API
 * 
 * BullMQ-based background job processing.
 * Queues: email, notifications, analytics, cleanup
 * Uses the same Redis instance as the cache layer.
 */

import { Module, Global } from '@nestjs/common';
import { QueueService } from './queue.service';
import { EmailProcessor } from './processors/email.processor';
import { BookingProcessor } from './processors/booking.processor';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [QueueService, EmailProcessor, BookingProcessor],
  exports: [QueueService],
})
export class QueueModule {}
