/**
 * Sentry Error Monitoring Configuration - API
 * 
 * Initializes Sentry for the NestJS backend.
 * Call this before creating the NestJS application.
 */
import * as Sentry from '@sentry/node';

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.log('⚠️  SENTRY_DSN not set - error monitoring disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.SENTRY_RELEASE || `hotel-api@${process.env.npm_package_version || '1.0.0'}`,
    
    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    
    // Profile sampling (relative to traces)
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Integrations
    integrations: [
      // HTTP request tracing
      Sentry.httpIntegration(),
      // Express middleware tracing  
      Sentry.expressIntegration(),
      // GraphQL operation tracing
      Sentry.graphqlIntegration(),
    ],

    // Filter out health check noise
    beforeSend(event) {
      // Skip health check errors
      if (event.request?.url?.includes('/health')) {
        return null;
      }
      return event;
    },

    // Scrub sensitive data
    beforeSendTransaction(event) {
      // Remove authorization headers from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((crumb) => {
          if (crumb.data?.headers?.authorization) {
            crumb.data.headers.authorization = '[Filtered]';
          }
          return crumb;
        });
      }
      return event;
    },
  });

  console.log('✅ Sentry error monitoring initialized');
}

export { Sentry };
