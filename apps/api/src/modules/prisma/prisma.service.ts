/**
 * Prisma Service
 * 
 * Database client wrapper with connection management.
 * Provides the PrismaClient to all modules.
 */

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      // Log queries in development
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });
  }

  /**
   * Connect to database when module initializes
   */
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected');
  }

  /**
   * Disconnect from database when module destroys
   */
  async onModuleDestroy() {
    await this.$disconnect();
    console.log('❌ Database disconnected');
  }

  /**
   * Clean database for testing
   * WARNING: Only use in test environment
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }
    
    // Delete in correct order due to foreign keys
    const tablenames = await this.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    for (const { tablename } of tablenames) {
      if (tablename !== '_prisma_migrations') {
        try {
          await this.$executeRawUnsafe(
            `TRUNCATE TABLE "public"."${tablename}" CASCADE;`
          );
        } catch (error) {
          console.log(`Could not truncate ${tablename}`);
        }
      }
    }
  }
}
