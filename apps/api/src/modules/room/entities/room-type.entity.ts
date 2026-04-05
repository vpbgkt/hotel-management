import { ObjectType, Field, ID, Float, Int, registerEnumType } from '@nestjs/graphql';
import { BookingModel } from '../../hotel/entities/hotel.entity';

export enum RoomStatus {
  AVAILABLE = 'AVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
  BLOCKED = 'BLOCKED',
}

registerEnumType(RoomStatus, {
  name: 'RoomStatus',
  description: 'Physical room status',
});

@ObjectType({ description: 'Room type entity' })
export class RoomType {
  @Field(() => ID)
  id: string;

  @Field()
  hotelId: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  description?: string;

  // Pricing
  @Field(() => Float)
  basePriceDaily: number;

  @Field(() => Float, { nullable: true })
  basePriceHourly?: number;

  // Capacity
  @Field(() => Int)
  maxGuests: number;

  @Field(() => Int)
  maxExtraGuests: number;

  @Field(() => Float)
  extraGuestCharge: number;

  // Inventory
  @Field(() => Int)
  totalRooms: number;

  // Features
  @Field(() => [String])
  amenities: string[];

  @Field(() => [String])
  images: string[];

  // Booking settings
  @Field(() => BookingModel, { nullable: true })
  bookingModelOverride?: BookingModel;

  @Field(() => Int, { nullable: true })
  minHours?: number;

  @Field(() => Int, { nullable: true })
  maxHours?: number;

  // Status
  @Field()
  isActive: boolean;

  @Field(() => Int)
  sortOrder: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Computed fields
  @Field(() => Int, { nullable: true })
  availableTonight?: number;
}

@ObjectType({ description: 'Physical room instance' })
export class Room {
  @Field(() => ID)
  id: string;

  @Field()
  hotelId: string;

  @Field()
  roomTypeId: string;

  @Field()
  roomNumber: string;

  @Field(() => Int)
  floor: number;

  @Field(() => RoomStatus)
  status: RoomStatus;

  @Field({ nullable: true })
  notes?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations
  @Field(() => RoomType, { nullable: true })
  roomType?: RoomType;
}

@ObjectType({ description: 'Room inventory for a specific date' })
export class RoomInventory {
  @Field(() => ID)
  id: string;

  @Field()
  roomTypeId: string;

  @Field()
  date: Date;

  @Field(() => Int)
  availableCount: number;

  @Field(() => Float, { nullable: true })
  priceOverride?: number;

  @Field(() => Int)
  minStayNights: number;

  @Field()
  isClosed: boolean;
}

@ObjectType({ description: 'Hourly slot availability' })
export class HourlySlot {
  @Field(() => ID)
  id: string;

  @Field()
  roomTypeId: string;

  @Field()
  date: Date;

  @Field()
  slotStart: string;

  @Field()
  slotEnd: string;

  @Field(() => Int)
  availableCount: number;

  @Field(() => Float, { nullable: true })
  priceOverride?: number;

  @Field()
  isClosed: boolean;
}

@ObjectType({ description: 'Room availability check result' })
export class RoomAvailability {
  @Field()
  date: Date;

  @Field(() => Int)
  available: number;

  @Field(() => Float)
  price: number;

  @Field()
  isClosed: boolean;
}

@ObjectType({ description: 'Hourly availability check result' })
export class HourlyAvailability {
  @Field()
  date: Date;

  @Field()
  slotStart: string;

  @Field()
  slotEnd: string;

  @Field(() => Int)
  available: number;

  @Field(() => Float)
  pricePerHour: number;

  @Field()
  isClosed: boolean;
}
