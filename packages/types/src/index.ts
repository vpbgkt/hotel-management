/**
 * @hotel/types - Shared TypeScript types and Zod schemas
 *
 * Used across both apps/api and apps/web for type-safe,
 * validated data throughout the platform.
 */

// ============================================
// Enums
// ============================================

export const BookingModel = {
  DAILY: 'DAILY',
  HOURLY: 'HOURLY',
  BOTH: 'BOTH',
} as const;
export type BookingModel = (typeof BookingModel)[keyof typeof BookingModel];

export const BookingType = {
  DAILY: 'DAILY',
  HOURLY: 'HOURLY',
} as const;
export type BookingType = (typeof BookingType)[keyof typeof BookingType];

export const BookingStatus = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  CHECKED_IN: 'CHECKED_IN',
  CHECKED_OUT: 'CHECKED_OUT',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

export const BookingSource = {
  DIRECT: 'DIRECT',
  WALK_IN: 'WALK_IN',
} as const;
export type BookingSource = (typeof BookingSource)[keyof typeof BookingSource];

export const PaymentStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  PARTIALLY_REFUNDED: 'PARTIALLY_REFUNDED',
  REFUNDED: 'REFUNDED',
  FAILED: 'FAILED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

export const PaymentGateway = {
  RAZORPAY: 'RAZORPAY',
  STRIPE: 'STRIPE',
  CASH: 'CASH',
  DEMO: 'DEMO',
} as const;
export type PaymentGateway = (typeof PaymentGateway)[keyof typeof PaymentGateway];

export const UserRole = {
  GUEST: 'GUEST',
  HOTEL_ADMIN: 'HOTEL_ADMIN',
  HOTEL_STAFF: 'HOTEL_STAFF',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];\n\n// ============================================\n// Core Interfaces
// ============================================

export interface Hotel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  phone: string;
  email: string;
  whatsapp?: string;
  logoUrl?: string;
  heroImageUrl?: string;
  starRating: number;
  bookingModel: BookingModel;
  checkInTime: string;
  checkOutTime: string;
  hourlyMinHours: number;
  hourlyMaxHours: number;
  commissionRate: number;
  isActive: boolean;
  isFeatured: boolean;
  themeConfig?: Record<string, unknown>;
}

export interface RoomType {
  id: string;
  hotelId: string;
  name: string;
  slug: string;
  description?: string;
  basePriceDaily: number;
  basePriceHourly?: number;
  maxGuests: number;
  maxExtraGuests: number;
  extraGuestCharge: number;
  totalRooms: number;
  amenities: string[];
  images: string[];
  bookingModelOverride?: BookingModel;
  isActive: boolean;
}

export interface Booking {
  id: string;
  bookingNumber: string;
  hotelId: string;
  guestId: string;
  roomTypeId: string;
  bookingType: BookingType;
  checkInDate: string;
  checkOutDate?: string;
  checkInTime?: string;
  checkOutTime?: string;
  numHours?: number;
  numRooms: number;
  numGuests: number;
  numExtraGuests: number;
  roomTotal: number;
  extraGuestTotal: number;
  taxes: number;
  discountAmount: number;
  totalAmount: number;
  commissionAmount: number;
  hotelPayout: number;
  source: BookingSource;
  status: BookingStatus;
  paymentStatus: PaymentStatus;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  specialRequests?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  avatarUrl?: string;
  role: UserRole;
  hotelId?: string;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface Review {
  id: string;
  hotelId: string;
  bookingId: string;
  guestId: string;
  rating: number;
  title?: string;
  comment?: string;
  photos: string[];
  hotelReply?: string;
  isVerified: boolean;
  isPublished: boolean;
  createdAt: string;
}

export interface Commission {
  id: string;
  hotelId: string;
  bookingId: string;
  bookingAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: SettlementStatus;
  settledAt?: string;
  createdAt: string;
}

// ============================================
// API Response Types
// ============================================

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AvailabilityResult {
  available: boolean;
  roomTypeId: string;
  date: string;
  price: number;
  availableCount: number;
}
