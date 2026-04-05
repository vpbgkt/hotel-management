/**
 * Hotel Manager API - Root Application Module
 * 
 * Configures all modules, GraphQL, and global providers.
 */

import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ThrottlerModule } from '@nestjs/throttler';
import { GraphQLISODateTime } from '@nestjs/graphql';
import { join } from 'path';
import { Request, Response } from 'express';

// Core modules
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';

// Feature modules
import { HotelModule } from './modules/hotel/hotel.module';
import { RoomModule } from './modules/room/room.module';
import { BookingModule } from './modules/booking/booking.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { PaymentModule } from './modules/payment/payment.module';
import { AdminModule } from './modules/admin/admin.module';
import { ReviewModule } from './modules/review/review.module';
import { NotificationModule } from './modules/notification/notification.module';
import { SmartPricingModule } from './modules/pricing/smart-pricing.module';
import { UploadModule } from './modules/upload/upload.module';
import { QueueModule } from './modules/queue/queue.module';
import { BlogModule } from './modules/blog/blog.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ExportModule } from './modules/export/export.module';
import { ApiKeyModule } from './modules/api-key/api-key.module';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

// Health check
import { HealthController } from './health.controller';

@Module({
  imports: [
    // Environment configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // GraphQL configuration with Apollo
    GraphQLModule.forRootAsync<ApolloDriverConfig>({
      driver: ApolloDriver,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        // Auto-generate schema from resolvers
        autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
        sortSchema: true,
        
        // Build schema options - register DateTime scalar
        buildSchemaOptions: {
          dateScalarMode: 'isoDate',
        },
        
        // Enable playground in development
        playground: configService.get('NODE_ENV') !== 'production',
        
        // Include stack traces in development
        debug: configService.get('NODE_ENV') !== 'production',
        
        // Context builder - extract tenant info from request
        context: ({ req, res }: { req: Request; res: Response }) => ({
          req,
          res,
          // Tenant context from middleware
          tenantType: req.headers['x-tenant-type'] || 'hotel',
          tenantId: req.headers['x-tenant-id'] || process.env.HOTEL_ID || 'default',
          hotelId: req.headers['x-hotel-id'] || process.env.HOTEL_ID || null,
        }),
        
        // Format errors for client
        formatError: (error: any) => {
          // In production, hide internal errors
          if (configService.get('NODE_ENV') === 'production') {
            // Log full error server-side
            console.error(error);
            
            // Return sanitized error to client
            return {
              message: error.message,
              code: error.extensions?.code || 'INTERNAL_ERROR',
            };
          }
          return error;
        },
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,    // 1 second
        limit: 10,    // 10 requests per second
      },
      {
        name: 'medium',
        ttl: 10000,   // 10 seconds
        limit: 50,    // 50 requests per 10 seconds
      },
      {
        name: 'long',
        ttl: 60000,   // 1 minute
        limit: 200,   // 200 requests per minute
      },
    ]),

    // Core infrastructure modules
    PrismaModule,
    RedisModule,

    // Feature modules
    HotelModule,
    RoomModule,
    BookingModule,
    AuthModule,
    UserModule,
    PaymentModule,
    AdminModule,
    ReviewModule,
    NotificationModule,
    SmartPricingModule,
    UploadModule,
    QueueModule,
    BlogModule,
    AnalyticsModule,
    ExportModule,
    ApiKeyModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
})
export class AppModule {}
