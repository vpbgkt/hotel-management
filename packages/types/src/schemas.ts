/**
 * @hotel/types - Zod Validation Schemas
 *
 * Shared validation schemas used by both frontend forms and backend DTOs.
 */

import { z } from 'zod';

// ============================================
// Auth Schemas
// ============================================

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number')
    .optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
});

export const otpRequestSchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
});

export const otpVerifySchema = z.object({
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
});

// ============================================
// Booking Schemas
// ============================================

export const createBookingSchema = z.object({
  hotelId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  checkInDate: z.string().or(z.date()),
  checkOutDate: z.string().or(z.date()).optional(),
  checkInTime: z.string().optional(),
  numHours: z.number().min(1).max(24).optional(),
  numRooms: z.number().min(1).max(10).default(1),
  numGuests: z.number().min(1).max(20).default(1),
  numExtraGuests: z.number().min(0).default(0),
  guestName: z.string().min(2).max(100),
  guestEmail: z.string().email(),
  guestPhone: z.string().min(10).max(15),
  specialRequests: z.string().max(500).optional(),
  bookingType: z.enum(['DAILY', 'HOURLY']).default('DAILY'),
  source: z.enum(['DIRECT', 'DIRECT', 'WALK_IN']).default('DIRECT'),
});

export const modifyBookingSchema = z.object({
  bookingId: z.string().uuid(),
  checkInDate: z.string().or(z.date()).optional(),
  checkOutDate: z.string().or(z.date()).optional(),
  numGuests: z.number().min(1).optional(),
  specialRequests: z.string().max(500).optional(),
});

// ============================================
// Review Schemas
// ============================================

export const createReviewSchema = z.object({
  bookingId: z.string().uuid(),
  rating: z.number().min(1).max(5),
  title: z.string().min(3).max(200).optional(),
  comment: z.string().min(10).max(2000).optional(),
});

// ============================================
// Hotel Schemas
// ============================================

export const hotelSettingsSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().max(5000).optional(),
  phone: z.string().min(10).max(15).optional(),
  email: z.string().email().optional(),
  whatsapp: z.string().min(10).max(15).optional(),
  bookingModel: z.enum(['DAILY', 'HOURLY', 'BOTH']).optional(),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  hourlyMinHours: z.number().min(1).max(24).optional(),
  hourlyMaxHours: z.number().min(1).max(24).optional(),
});

// ============================================
// Type Exports from Schemas
// ============================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type OtpRequestInput = z.infer<typeof otpRequestSchema>;
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type ModifyBookingInput = z.infer<typeof modifyBookingSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type HotelSettingsInput = z.infer<typeof hotelSettingsSchema>;
