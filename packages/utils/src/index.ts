/**
 * @hotel/utils - Shared utility functions
 *
 * Common utilities used across both API and web apps.
 */

// ============================================
// Currency Formatting
// ============================================

/**
 * Format amount as Indian Rupees
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format amount with currency code
 */
export function formatCurrency(
  amount: number,
  currency: string = 'INR',
): string {
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ============================================
// Date Utilities
// ============================================

/**
 * Calculate number of nights between check-in and check-out
 */
export function calculateNights(checkIn: Date | string, checkOut: Date | string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Format date as "15 Mar 2026"
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format date as "15 Mar 2026, 2:00 PM"
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format time string "14:00" as "2:00 PM"
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const h = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  return `${h}:${String(minutes).padStart(2, '0')} ${ampm}`;
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: Date | string): boolean {
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date | string): boolean {
  const d = new Date(date);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

// ============================================
// Slug & String Utilities
// ============================================

/**
 * Generate a URL-friendly slug from text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Generate a random booking number
 */
export function generateBookingNumber(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `BK-${date}-${suffix}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// ============================================
// Tax Calculation
// ============================================

/**
 * Calculate GST for hotel bookings (India)
 * - Up to ₹7,500: 12% GST
 * - Above ₹7,500: 18% GST
 */
export function calculateGST(
  roomTotal: number,
  perNightRate: number,
): { rate: number; amount: number } {
  const rate = perNightRate <= 7500 ? 0.12 : 0.18;
  return {
    rate,
    amount: Math.round(roomTotal * rate),
  };
}

/**
 * Calculate total booking amount
 */
export function calculateBookingTotal(params: {
  roomRate: number;
  nights: number;
  numRooms: number;
  extraGuests?: number;
  extraGuestCharge?: number;
  discountPercent?: number;
}): {
  roomTotal: number;
  extraGuestTotal: number;
  subtotal: number;
  discount: number;
  gstRate: number;
  taxes: number;
  total: number;
} {
  const roomTotal = params.roomRate * params.nights * params.numRooms;
  const extraGuestTotal =
    (params.extraGuests || 0) *
    (params.extraGuestCharge || 0) *
    params.nights;
  const subtotal = roomTotal + extraGuestTotal;
  const discount = params.discountPercent
    ? Math.round(subtotal * params.discountPercent)
    : 0;
  const afterDiscount = subtotal - discount;
  const { rate: gstRate, amount: taxes } = calculateGST(
    afterDiscount,
    params.roomRate,
  );

  return {
    roomTotal,
    extraGuestTotal,
    subtotal,
    discount,
    gstRate,
    taxes,
    total: afterDiscount + taxes,
  };
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate Indian phone number
 */
export function isValidIndianPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Mask email (e.g., "j***@example.com")
 */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (user.length <= 2) return `${user[0]}***@${domain}`;
  return `${user[0]}***@${domain}`;
}

/**
 * Mask phone (e.g., "98****3210")
 */
export function maskPhone(phone: string): string {
  if (phone.length < 6) return phone;
  return phone.slice(0, 2) + '****' + phone.slice(-4);
}
