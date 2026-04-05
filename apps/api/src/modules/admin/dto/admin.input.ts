import { InputType, Field, Float, Int, ID } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsEnum, IsEmail, IsBoolean, IsArray, IsDate, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { BookingModel, HotelTemplate } from '../../hotel/entities/hotel.entity';

@InputType()
export class UpdateHotelInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  hotelId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  address?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  city?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  state?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  pincode?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  heroImageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  starRating?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  checkInTime?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  checkOutTime?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  themeConfig?: Record<string, unknown>;

  @Field(() => BookingModel, { nullable: true })
  @IsOptional()
  @IsEnum(BookingModel)
  bookingModel?: BookingModel;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  hourlyMinHours?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  hourlyMaxHours?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  razorpayAccountId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  stripeAccountId?: string;

  @Field(() => HotelTemplate, { nullable: true })
  @IsOptional()
  @IsEnum(HotelTemplate)
  template?: HotelTemplate;
}

@InputType()
export class CreateRoomTypeInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  hotelId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  slug: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Float)
  @IsNumber()
  basePriceDaily: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  basePriceHourly?: number;

  @Field(() => Int, { defaultValue: 2 })
  @IsNumber()
  maxGuests: number;

  @Field(() => Int, { defaultValue: 0 })
  @IsNumber()
  maxExtraGuests: number;

  @Field(() => Float, { defaultValue: 0 })
  @IsNumber()
  extraGuestCharge: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsNumber()
  totalRooms: number;

  @Field(() => [String], { defaultValue: [] })
  @IsArray()
  amenities: string[];

  @Field(() => [String], { defaultValue: [] })
  @IsArray()
  images: string[];

  @Field(() => Int, { defaultValue: 0 })
  @IsNumber()
  sortOrder: number;
}

@InputType()
export class UpdateRoomTypeInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  basePriceDaily?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  basePriceHourly?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  maxGuests?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  maxExtraGuests?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  extraGuestCharge?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  totalRooms?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  amenities?: string[];

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  images?: string[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  sortOrder?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@InputType()
export class BulkInventoryUpdateInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  roomTypeId: string;

  @Field()
  @IsNotEmpty()
  startDate: Date;

  @Field()
  @IsNotEmpty()
  endDate: Date;

  @Field(() => Float, { nullable: true, description: 'Price override for the date range (null = use base price)' })
  @IsOptional()
  @IsNumber()
  priceOverride?: number;

  @Field(() => Int, { nullable: true, description: 'Override available count' })
  @IsOptional()
  @IsNumber()
  availableCount?: number;

  @Field({ nullable: true, description: 'Close/open dates for booking' })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @Field(() => Int, { nullable: true, description: 'Minimum stay nights' })
  @IsOptional()
  @IsNumber()
  minStayNights?: number;
}

@InputType()
export class SingleDateInventoryInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  roomTypeId: string;

  @Field()
  @IsNotEmpty()
  date: Date;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  priceOverride?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  availableCount?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isClosed?: boolean;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsNumber()
  minStayNights?: number;
}

// ============================================
// SEO Meta
// ============================================

@InputType()
export class UpsertSeoMetaInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  hotelId: string;

  @Field({ description: 'Page identifier e.g. "homepage", "rooms", "contact"' })
  @IsNotEmpty()
  @IsString()
  pageSlug: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  ogImageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  canonicalUrl?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  @IsOptional()
  customJsonLd?: any;
}

// ============================================
// Content / Theme
// ============================================

@InputType()
export class UpdateHotelContentInput {
  @Field(() => ID)
  @IsNotEmpty()
  @IsString()
  hotelId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  heroImageUrl?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @Field(() => GraphQLJSON, { nullable: true, description: 'Theme config: { primaryColor, fontFamily, etc. }' })
  @IsOptional()
  themeConfig?: any;
}

// ============================================
// Staff Management
// ============================================

@InputType()
export class StaffPermissionsInput {
  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  canManageBookings?: boolean;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  canManageRooms?: boolean;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  canManagePricing?: boolean;

  @Field({ nullable: true, defaultValue: true })
  @IsOptional()
  @IsBoolean()
  canManageReviews?: boolean;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  canManageContent?: boolean;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  canViewAnalytics?: boolean;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  @IsBoolean()
  canManageStaff?: boolean;
}

@InputType()
export class CreateStaffInput {
  @Field(() => ID)
  @IsNotEmpty()
  hotelId: string;

  @Field()
  @IsNotEmpty()
  @IsString()
  name: string;

  @Field()
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @Field(() => StaffPermissionsInput, { nullable: true })
  @IsOptional()
  permissions?: StaffPermissionsInput;
}

@InputType()
export class UpdateStaffInput {
  @Field(() => ID)
  @IsNotEmpty()
  hotelId: string;

  @Field(() => ID)
  @IsNotEmpty()
  staffId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Field(() => StaffPermissionsInput, { nullable: true })
  @IsOptional()
  permissions?: StaffPermissionsInput;
}
