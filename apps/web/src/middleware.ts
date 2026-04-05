import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Hotel Manager — Single-Tenant Middleware
 * 
 * Sets tenant headers for the single hotel this instance manages.
 * All requests are treated as hotel-tenant (no aggregator mode).
 */

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Skip middleware for static files and API routes
  if (
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/api") ||
    url.pathname.includes(".") // Static files have extensions
  ) {
    return NextResponse.next();
  }
  
  // Single-hotel mode: always set tenant type to "hotel"
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-tenant-type", "hotel");
  requestHeaders.set("x-tenant-id", process.env.HOTEL_ID || "default");
  
  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // ── Security Headers ──────────────────────────────────────
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(self), payment=(self)'
  );
  response.headers.set('X-DNS-Prefetch-Control', 'on');

  return response;
}

/**
 * Configure which paths the middleware runs on
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*|api).*)",
  ],
};
