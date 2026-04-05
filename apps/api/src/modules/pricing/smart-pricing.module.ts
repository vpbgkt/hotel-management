import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SmartPricingService } from './smart-pricing.service';
import { SmartPricingResolver } from './smart-pricing.resolver';

@Module({
  imports: [PrismaModule],
  providers: [SmartPricingService, SmartPricingResolver],
  exports: [SmartPricingService],
})
export class SmartPricingModule {}
