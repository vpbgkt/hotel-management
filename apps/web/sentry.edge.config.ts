/**
 * Sentry Edge Configuration
 * 
 * This file configures the Sentry SDK for Edge Runtime (middleware).
 * It is automatically loaded by @sentry/nextjs for edge functions.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV || 'development',

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Don't send errors in development unless DSN is explicitly set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
});
