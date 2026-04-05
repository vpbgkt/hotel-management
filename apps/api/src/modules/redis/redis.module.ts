/**
 * Redis Module
 * 
 * Global module providing Redis access to all other modules.
 */

import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
