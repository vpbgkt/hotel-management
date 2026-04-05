/**
 * Hotel Manager API — Main Entry Point
 * 
 * NestJS backend for standalone hotel management.
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { initSentry } from './sentry';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';

// Initialize Sentry before anything else
initSentry();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Enable raw body for webhook signature verification (Razorpay)
    rawBody: true,
    // Enable logging in development
    logger: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn'] 
      : ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // Swagger API Documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hotel Manager API')
    .setDescription(
      'Standalone hotel management and booking platform API. ' +
      'Primary API is GraphQL at /graphql. REST endpoints are documented here.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addApiKey(
      { type: 'apiKey', name: 'x-hotel-id', in: 'header' },
      'HotelId',
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('Auth', 'Authentication & authorization')
    .addTag('Hotels', 'Hotel management')
    .addTag('Bookings', 'Booking operations')
    .addTag('Payments', 'Payment processing (Razorpay)')
    .addTag('Uploads', 'File upload management')
    .addTag('Webhooks', 'Payment webhook handlers')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Hotel Manager API Docs',
  });

  // Security headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Response compression
  app.use(compression());

  // Static file serving for uploads
  const uploadsDir = join(process.cwd(), 'uploads');
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }
  app.useStaticAssets(uploadsDir, { prefix: '/uploads/' });

  // Global prefix for REST endpoints (GraphQL is at /graphql)
  app.setGlobalPrefix('api', {
    exclude: ['graphql', 'health'], // Exclude GraphQL and health check
  });

  // Enable CORS
  const allowedOrigins = [
    'http://localhost:3000',
    // Load additional origins from env
    ...(process.env.CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || []),
  ];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Allow known static origins
      if (allowedOrigins.includes(origin)) return callback(null, true);

      // Allow GitHub Codespaces forwarded URLs
      try {
        if (/\.app\.github\.dev$/.test(new URL(origin).hostname)) return callback(null, true);
      } catch {}

      // In dev mode, allow all origins
      if (process.env.NODE_ENV !== 'production') return callback(null, true);

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-hotel-id', 'x-tenant-type', 'x-api-key'],
  });

  // Global validation pipe for DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip unknown properties
      forbidNonWhitelisted: true, // Throw error on unknown properties
      transform: true,           // Auto-transform payloads to DTO instances
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Sentry exception filter (captures 5xx errors)
  app.useGlobalFilters(new SentryExceptionFilter());

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  const port = process.env.PORT || 4000;
  await app.listen(port);
  
  console.log(`🚀 Hotel Manager API running on http://localhost:${port}`);
  console.log(`📊 GraphQL Playground: http://localhost:${port}/graphql`);
  console.log(`📖 Swagger API Docs: http://localhost:${port}/api/docs`);
}

bootstrap();
