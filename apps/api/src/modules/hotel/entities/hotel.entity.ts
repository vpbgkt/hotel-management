import { ObjectType, Field, ID, Float, Int, registerEnumType } from '@nestjs/graphql';
import { GraphQLJSON } from 'graphql-scalars';
import { RoomType } from '../../room/entities/room-type.entity';
import { Review } from '../../review/entities/review.entity';

// Register enums
export enum BookingModel {
  DAILY = 'DAILY',
  HOURLY = 'HOURLY',
  BOTH = 'BOTH',
}

export enum CommissionType {
  PERCENTAGE = 'PERCENTAGE',
  FLAT = 'FLAT',
}

export enum HotelTemplate {
  STARTER = 'STARTER',
  MODERN_MINIMAL = 'MODERN_MINIMAL',
  LUXURY_RESORT = 'LUXURY_RESORT',
  HERITAGE_BOUTIQUE = 'HERITAGE_BOUTIQUE',
}

registerEnumType(BookingModel, {
  name: 'BookingModel',
  description: 'Booking model type',
});

registerEnumType(CommissionType, {
  name: 'CommissionType',
  description: 'Commission calculation type',
});

registerEnumType(HotelTemplate, {
  name: 'HotelTemplate',
  description: 'Hotel website template style',
});

@ObjectType({ description: 'Hotel entity' })
export class Hotel {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  description?: string;

  // Location
  @Field()
  address: string;

  @Field()
  city: string;

  @Field()
  state: string;

  @Field()
  country: string;

  @Field()
  pincode: string;

  @Field(() => Float, { nullable: true })
  latitude?: number;

  @Field(() => Float, { nullable: true })
  longitude?: number;

  // Contact
  @Field()
  phone: string;

  @Field()
  email: string;

  @Field({ nullable: true })
  whatsapp?: string;

  // Branding
  @Field({ nullable: true })
  logoUrl?: string;

  @Field({ nullable: true })
  heroImageUrl?: string;

  // Configuration
  @Field(() => Int)
  starRating: number;

  @Field(() => BookingModel)
  bookingModel: BookingModel;

  @Field()
  checkInTime: string;

  @Field()
  checkOutTime: string;

  @Field(() => Int)
  hourlyMinHours: number;

  @Field(() => Int)
  hourlyMaxHours: number;

  // Commission (only for platform admins)
  @Field(() => Float, { nullable: true })
  commissionRate?: number;

  // Payment gateway accounts
  @Field({ nullable: true })
  razorpayAccountId?: string;

  @Field({ nullable: true })
  stripeAccountId?: string;

  // Theme
  @Field(() => GraphQLJSON, { nullable: true })
  themeConfig?: Record<string, unknown>;

  @Field(() => HotelTemplate)
  template: HotelTemplate;

  // Status
  @Field()
  isActive: boolean;

  // Timestamps
  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  // Relations (resolved by field resolvers)


  @Field(() => [RoomType], { nullable: true })
  roomTypes?: RoomType[];

  @Field(() => [Review], { nullable: true })
  reviews?: Review[];

  // Computed fields
  @Field(() => Float, { nullable: true })
  averageRating?: number;

  @Field(() => Int, { nullable: true })
  reviewCount?: number;

  @Field(() => Float, { nullable: true })
  startingPrice?: number;
}

@ObjectType({ description: 'Paginated hotels response' })
export class PaginatedHotels {
  @Field(() => [Hotel])
  hotels: Hotel[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;

  @Field()
  hasMore: boolean;
}
