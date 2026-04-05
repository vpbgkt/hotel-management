/**
 * Next.js Instrumentation
 * 
 * This file is automatically loaded by Next.js to initialize
 * monitoring and tracing tools like Sentry.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config');
  }
}

export const onRequestError = async (
  err: { digest: string } & Error,
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string };
  },
  context: {
    routerKind: string;
    routePath: string;
    routeType: string;
    renderSource: string;
    revalidateReason: string | undefined;
    renderType: string;
  },
) => {
  // Only import Sentry if DSN is configured
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const { captureRequestError } = await import('@sentry/nextjs');
    captureRequestError(err, request, context);
  }
};
