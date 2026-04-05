/**
 * @hotel/config - Shared configuration constants
 */

// ============================================
// App Constants (override via env vars)
// ============================================

export const APP_NAME = process.env.APP_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'My Hotel';
export const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
export const APP_EMAIL = process.env.APP_EMAIL || 'noreply@localhost';

// ============================================
// Booking Limits
// ============================================

export const BOOKING_LIMITS = {
  MAX_ROOMS_PER_BOOKING: 10,
  MAX_GUESTS_PER_ROOM: 6,
  MAX_ADVANCE_DAYS: 365,
  MIN_HOURLY_HOURS: 1,
  MAX_HOURLY_HOURS: 24,
  BOOKING_HOLD_TTL: 10 * 60, // 10 minutes (seconds)
  MAX_SPECIAL_REQUESTS_LENGTH: 500,
} as const;

// ============================================
// Payment Configuration
// ============================================

export const PAYMENT_CONFIG = {
  DEFAULT_CURRENCY: 'INR',
  MIN_AMOUNT: 100, // ₹100 minimum
  RAZORPAY_KEY_PREFIX: 'rzp_',
  REFUND_WINDOW_HOURS: 48,
} as const;

// ============================================
// GST Rates (India)
// ============================================

export const GST_RATES = {
  BELOW_7500: 0.12, // 12% for rooms ≤₹7,500/night
  ABOVE_7500: 0.18, // 18% for rooms >₹7,500/night
  THRESHOLD: 7500,
} as const;

// ============================================
// File Upload Limits
// ============================================

export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILES_PER_UPLOAD: 20,
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
  ],
  THUMBNAIL_SIZE: { width: 400, height: 300 },
  MEDIUM_SIZE: { width: 800, height: 600 },
  LARGE_SIZE: { width: 1920, height: 1080 },
  OG_SIZE: { width: 1200, height: 630 },
} as const;

// ============================================
// Cache TTLs (seconds)
// ============================================

export const CACHE_TTL = {
  HOTEL_INFO: 3600, // 1 hour
  ROOM_TYPES: 1800, // 30 minutes
  AVAILABILITY: 60, // 1 minute
  REVIEWS: 300, // 5 minutes
  ANALYTICS: 600, // 10 minutes
  SEARCH_RESULTS: 120, // 2 minutes
  COMMISSION_SUMMARY: 300, // 5 minutes (kept for analytics)
} as const;

// ============================================
// Rate Limiting
// ============================================

export const RATE_LIMITS = {
  LOGIN_ATTEMPTS: { max: 5, window: 300 }, // 5 per 5 minutes
  OTP_REQUESTS: { max: 3, window: 300 }, // 3 per 5 minutes
  BOOKING_ATTEMPTS: { max: 10, window: 60 }, // 10 per minute
  API_DEFAULT: { max: 200, window: 60 }, // 200 per minute
} as const;

// ============================================
// SEO Defaults
// ============================================

export const SEO_DEFAULTS = {
  TITLE_SUFFIX: ` | ${process.env.APP_NAME || process.env.NEXT_PUBLIC_APP_NAME || 'Hotel'}`,
  OG_IMAGE_WIDTH: 1200,
  OG_IMAGE_HEIGHT: 630,
  SITEMAP_REVALIDATE: 3600, // 1 hour
  DEFAULT_LOCALE: 'en-IN',
} as const;
