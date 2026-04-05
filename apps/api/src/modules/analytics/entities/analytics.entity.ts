import { ObjectType, Field, ID, Float, Int } from '@nestjs/graphql';

// ============================================
// Revenue Analytics
// ============================================

@ObjectType()
export class RevenueBySource {
  @Field() source: string;
  @Field(() => Float) revenue: number;
  @Field(() => Int) bookings: number;
}

@ObjectType()
export class DailyRevenue {
  @Field() date: string;
  @Field(() => Float) revenue: number;
}

@ObjectType()
export class RevenueAnalytics {
  @Field(() => Float) totalRevenue: number;
  @Field(() => Int) bookingCount: number;
  @Field(() => Float) previousRevenue: number;
  @Field(() => Int) previousBookingCount: number;
  @Field(() => Float) revenueGrowth: number;
  @Field(() => [RevenueBySource]) revenueBySource: RevenueBySource[];
  @Field(() => [DailyRevenue]) dailyRevenue: DailyRevenue[];
}

// ============================================
// Occupancy Analytics
// ============================================

@ObjectType()
export class OccupancyByRoomType {
  @Field() roomType: string;
  @Field(() => Int) totalRooms: number;
  @Field(() => Int) bookedRoomNights: number;
  @Field(() => Int) occupancy: number;
}

@ObjectType()
export class OccupancyAnalytics {
  @Field(() => Int) totalRooms: number;
  @Field(() => Int) totalRoomNights: number;
  @Field(() => Int) maxRoomNights: number;
  @Field(() => Int) occupancyRate: number;
  @Field(() => [OccupancyByRoomType]) occupancyByRoomType: OccupancyByRoomType[];
  @Field() period: string;
}

// ============================================
// Booking Analytics
// ============================================

@ObjectType()
export class StatusBreakdown {
  @Field() status: string;
  @Field(() => Int) count: number;
}

@ObjectType()
export class SourceBreakdown {
  @Field() source: string;
  @Field(() => Int) count: number;
  @Field(() => Float) revenue: number;
}

@ObjectType()
export class TypeBreakdown {
  @Field() type: string;
  @Field(() => Int) count: number;
}

@ObjectType()
export class TopRoomType {
  @Field() roomType: string;
  @Field(() => Int) bookings: number;
  @Field(() => Float) revenue: number;
}

@ObjectType()
export class BookingAnalytics {
  @Field(() => Int) totalBookings: number;
  @Field(() => Float) avgBookingValue: number;
  @Field(() => Int) cancellationRate: number;
  @Field(() => [StatusBreakdown]) statusBreakdown: StatusBreakdown[];
  @Field(() => [SourceBreakdown]) sourceBreakdown: SourceBreakdown[];
  @Field(() => [TypeBreakdown]) typeBreakdown: TypeBreakdown[];
  @Field(() => [TopRoomType]) topRoomTypes: TopRoomType[];
}

// ============================================
// Guest Analytics
// ============================================

@ObjectType()
export class TopGuest {
  @Field() guestId: string;
  @Field() name: string;
  @Field({ nullable: true }) email?: string;
  @Field(() => Float) totalSpent: number;
  @Field(() => Int) bookingCount: number;
}

@ObjectType()
export class GuestAnalytics {
  @Field(() => Int) totalGuests: number;
  @Field(() => Int) newGuests: number;
  @Field(() => Int) returningGuests: number;
  @Field(() => Float) avgRating: number;
  @Field(() => [TopGuest]) topGuests: TopGuest[];
}

// ============================================
// Platform Revenue Overview
// ============================================

@ObjectType()
export class TopHotelRevenue {
  @Field() hotelId: string;
  @Field() name: string;
  @Field() city: string;
  @Field(() => Float) revenue: number;
  @Field(() => Int) bookings: number;
}

@ObjectType()
export class PlatformRevenueOverview {
  @Field(() => Float) totalRevenue: number;
  @Field(() => Float) totalCommission: number;
  @Field(() => Int) bookingCount: number;
  @Field(() => [TopHotelRevenue]) topHotels: TopHotelRevenue[];
  @Field(() => [DailyRevenue]) dailyRevenue: DailyRevenue[];
}
