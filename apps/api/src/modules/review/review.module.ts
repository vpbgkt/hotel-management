import { Module } from '@nestjs/common';
import { ReviewService } from './review.service';
import { ReviewResolver } from './review.resolver';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [ReviewService, ReviewResolver],
  exports: [ReviewService],
})
export class ReviewModule {}
