import { ObjectType, Field, ID, Float, Int, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';

export enum BookingType {
  DAILY = 'DAILY',
  HOURLY = 'HOURLY',
}

export enum BookingSource {
  DIRECT = 'DIRECT',
  WALK_IN = 'WALK_IN',
}

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CHECKED_IN = 'CHECKED_IN',
  CHECKED_OUT = 'CHECKED_OUT',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

registerEnumType(BookingType, {
  name: 'BookingType',
  description: 'Type of booking (daily or hourly)',
});

registerEnumType(BookingSource, {
  name: 'BookingSource',
  description: 'Source of the booking',
});

registerEnumType(BookingStatus, {
  name: 'BookingStatus',
  description: 'Status of the booking',
});

registerEnumType(PaymentStatus, {
  name: 'PaymentStatus',
  description: 'Payment status of the booking',
});

// Define helper types BEFORE they are referenced

@ObjectType()
export class BookingHotel {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field()
  address: string;

  @Field()
  city: string;

  @Field()
  phone: string;
}

@ObjectType()
export class BookingRoomType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field(() => [String])
  images: string[];
}

@ObjectType({ description: 'Payment entity' })
export class Payment {
  @Field(() => ID)
  id: string;

  @Field()
  bookingId: string;

  @Field()
  gateway: string;

  @Field({ nullable: true })
  gatewayPaymentId?: string;

  @Field({ nullable: true })
  gatewayOrderId?: string;

  @Field(() => Float)
  amount: number;

  @Field()
  currency: string;

  @Field()
  status: string;

  @Field(() => Float)
  refundAmount: number;

  @Field({ nullable: true })
  refundId?: string;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType({ description: 'Booking entity' })
export class Booking {
  @Field(() => ID)
  id: string;

  @Field()
  bookingNumber: string;

  @Field()
  hotelId: string;

  @Field()
  guestId: string;

  @Field()
  roomTypeId: string;

  @Field({ nullable: true })
  assignedRoomId?: string;

  // Booking type
  @Field(() => BookingType)
  bookingType: BookingType;

  // Daily booking
  @Field()
  checkInDate: Date;

  @Field({ nullable: true })
  checkOutDate?: Date;

  // Hourly booking
  @Field({ nullable: true })
  checkInTime?: string;

  @Field({ nullable: true })
  checkOutTime?: string;

  @Field(() => Int, { nullable: true })
  numHours?: number;

  // Quantities
  @Field(() => Int)
  numRooms: number;

  @Field(() => Int)
  numGuests: number;

  @Field(() => Int)
  numExtraGuests: number;

  // Pricing
  @Field(() => Float)
  roomTotal: number;

  @Field(() => Float)
  extraGuestTotal: number;

  @Field(() => Float)
  taxes: number;

  @Field(() => Float)
  discountAmount: number;

  @Field(() => Float)
  totalAmount: number;

  // Commission
  @Field(() => Float)
  commissionAmount: number;

  @Field(() => Float)
  hotelPayout: number;

  // Source & status
  @Field(() => BookingSource)
  source: BookingSource;

  @Field(() => BookingStatus)
  status: BookingStatus;

  @Field(() => PaymentStatus)
  paymentStatus: PaymentStatus;

  // Cancellation
  @Field({ nullable: true })
  cancellationReason?: string;

  @Field({ nullable: true })
  cancelledAt?: Date;

  // Guest info
  @Field()
  guestName: string;

  @Field()
  guestEmail: string;

  @Field()
  guestPhone: string;

  @Field({ nullable: true })
  specialRequests?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => BookingHotel, { nullable: true })
  hotel?: BookingHotel;

  @Field(() => BookingRoomType, { nullable: true })
  roomType?: BookingRoomType;

  @Field(() => [Payment], { nullable: true })
  payments?: Payment[];
}

@ObjectType({ description: 'Booking creation result' })
export class BookingResult {
  @Field()
  success: boolean;

  @Field({ nullable: true })
  message?: string;

  @Field(() => Booking, { nullable: true })
  booking?: Booking;

  @Field({ nullable: true })
  paymentOrderId?: string;

  @Field({ nullable: true })
  paymentAmount?: number;
}

@ObjectType({ description: 'Paginated bookings result' })
export class PaginatedBookings {
  @Field(() => [Booking])
  bookings: Booking[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field()
  hasMore: boolean;
}
