import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Next.js configuration for BlueStay web application
 * Supports multi-tenant architecture with dynamic domain-based routing
 */
const nextConfig: NextConfig = {
  // Enable React strict mode for better development experience
  reactStrictMode: true,

  // Standalone output for Docker deployment
  output: "standalone",

  // Transpile shared packages from monorepo
  transpilePackages: ["@hotel/ui", "@hotel/types", "@hotel/utils"],

  // Image optimization configuration
  images: {
    // Allow images from CDN and hotel domains
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "**.bluestay.in",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "cdn.bluestay.in",
      },
    ],
    // Modern image formats for better compression
    formats: ["image/avif", "image/webp"],
  },

  // Enable experimental features
  experimental: {
    // Enable server actions for form handling
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },

  // Headers for security and CORS
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self), payment=(self)",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/graphql",
        destination: "http://localhost:4000/graphql",
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // Suppresses source map uploading logs during build
  silent: true,
  
  // Upload source maps only when SENTRY_AUTH_TOKEN is set
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Source maps configuration
  sourcemaps: {
    disable: false,
  },

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: "/monitoring",
});
