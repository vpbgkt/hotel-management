/**
 * Utility functions for Hotel Manager web application
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge Tailwind CSS classes with proper conflict resolution
 * Uses clsx for conditional classes and tailwind-merge for deduplication
 * 
 * @example
 * cn("px-4 py-2", isActive && "bg-blue-500", "px-6") // → "py-2 px-6 bg-blue-500"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format currency with proper locale and symbol
 * 
 * @example
 * formatCurrency(3500, "INR") // → "₹3,500"
 * formatCurrency(100, "USD") // → "$100"
 */
export function formatCurrency(
  amount: number,
  currency: string = "INR",
  locale: string = "en-IN"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date in a human-readable way
 * 
 * @example
 * formatDate(new Date()) // → "28 Feb 2026"
 */
export function formatDate(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  }
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", options);
}

/**
 * Format time in 12-hour format
 * 
 * @example
 * formatTime("14:00") // → "2:00 PM"
 */
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

/**
 * Calculate number of nights between two dates
 * 
 * @example
 * calculateNights(checkIn, checkOut) // → 2
 */
export function calculateNights(checkIn: Date, checkOut: Date): number {
  const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Generate a random booking reference number
 * 
 * @example
 * generateBookingRef() // → "BK-20260228-X7K9"
 */
export function generateBookingRef(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BK-${date}-${random}`;
}

/**
 * Truncate text with ellipsis
 * 
 * @example
 * truncate("Long text here", 10) // → "Long te..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Debounce function for search inputs
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
}

/**
 * Check if we're running on the server
 */
export const isServer = typeof window === "undefined";

/**
 * Check if the current domain is the aggregator (hotel.local)
 * vs a hotel white-label domain
 */
export function isAggregatorDomain(hostname: string): boolean {
  const aggregatorDomains = ["hotel.local", "www.hotel.local", "localhost:3000"];
  return aggregatorDomains.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

/**
 * Extract hotel slug from domain
 * 
 * @example
 * getHotelSlugFromDomain("radhikaresort.in") // → "radhika-resort" (from DB)
 */
export function extractSubdomain(hostname: string): string | null {
  // For custom domains like radhikaresort.in, we'll look up in DB
  // For subdomains like radhika.hotel.local, extract the subdomain
  const parts = hostname.split(".");
  if (parts.length >= 3 && parts[parts.length - 2] === "hotel") {
    return parts[0];
  }
  return null;
}

/**
 * Generate SEO-friendly slug from text
 * 
 * @example
 * slugify("Deluxe Ocean View Room") // → "deluxe-ocean-view-room"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parse star rating to array for rendering
 * 
 * @example
 * parseRating(4.5) // → [1, 1, 1, 1, 0.5] (full, full, full, full, half)
 */
export function parseRating(rating: number): ("full" | "half" | "empty")[] {
  const stars: ("full" | "half" | "empty")[] = [];
  for (let i = 1; i <= 5; i++) {
    if (rating >= i) {
      stars.push("full");
    } else if (rating >= i - 0.5) {
      stars.push("half");
    } else {
      stars.push("empty");
    }
  }
  return stars;
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Get dates between two dates (inclusive)
 */
export function getDatesBetween(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return dates;
}
