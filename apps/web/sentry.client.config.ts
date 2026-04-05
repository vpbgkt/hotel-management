/**
 * Sentry Client Configuration
 * 
 * This file configures the Sentry SDK for the browser (client-side).
 * It is automatically loaded by @sentry/nextjs.
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV || 'development',
  
  // Performance monitoring - sample rate for browser
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

  // Session replay for debugging UI issues
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
    Sentry.browserTracingIntegration(),
  ],

  // Don't send errors in development unless DSN is explicitly set
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Ignore common non-actionable errors
  ignoreErrors: [
    // Browser extensions
    'top.GLOBALS',
    'originalCreateNotification',
    'canvas.contentDocument',
    // Network errors
    'Network request failed',
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    // User navigation
    'AbortError',
    'cancelled',
    // ResizeObserver
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
  ],
});
