import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingResolver } from './booking.resolver';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [PaymentModule],
  controllers: [InvoiceController],
  providers: [BookingService, BookingResolver, InvoiceService],
  exports: [BookingService, InvoiceService],
})
export class BookingModule {}
