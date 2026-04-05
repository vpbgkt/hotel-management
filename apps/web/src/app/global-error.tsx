'use client';

/**
 * Global Error Boundary - Hotel Manager
 * Catches unhandled errors in the root layout
 */

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              An unexpected error occurred. Please try again or return to the homepage.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={reset}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
              >
                <Home className="w-4 h-4" />
                Go Home
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
