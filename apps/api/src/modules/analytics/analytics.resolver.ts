import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import {
  RevenueAnalytics,
  OccupancyAnalytics,
  BookingAnalytics,
  GuestAnalytics,
} from './entities/analytics.entity';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';

@Resolver()
export class AnalyticsResolver {
  constructor(private readonly analyticsService: AnalyticsService) {}

  // ============================================
  // Hotel Analytics
  // ============================================

  @Query(() => RevenueAnalytics, {
    name: 'revenueAnalytics',
    description: 'Get revenue analytics for a hotel',
  })
  @UseGuards(GqlAuthGuard)
  async getRevenueAnalytics(
    @Args('hotelId', { type: () => ID }) hotelId: string,
    @Args('period', { nullable: true, defaultValue: '30d' }) period?: string,
  ) {
    return this.analyticsService.getRevenueAnalytics(hotelId, period);
  }

  @Query(() => OccupancyAnalytics, {
    name: 'occupancyAnalytics',
    description: 'Get occupancy analytics for a hotel',
  })
  @UseGuards(GqlAuthGuard)
  async getOccupancyAnalytics(
    @Args('hotelId', { type: () => ID }) hotelId: string,
    @Args('period', { nullable: true, defaultValue: '30d' }) period?: string,
  ) {
    return this.analyticsService.getOccupancyAnalytics(hotelId, period);
  }

  @Query(() => BookingAnalytics, {
    name: 'bookingAnalytics',
    description: 'Get booking analytics for a hotel',
  })
  @UseGuards(GqlAuthGuard)
  async getBookingAnalytics(
    @Args('hotelId', { type: () => ID }) hotelId: string,
    @Args('period', { nullable: true, defaultValue: '30d' }) period?: string,
  ) {
    return this.analyticsService.getBookingAnalytics(hotelId, period);
  }

  @Query(() => GuestAnalytics, {
    name: 'guestAnalytics',
    description: 'Get guest analytics for a hotel',
  })
  @UseGuards(GqlAuthGuard)
  async getGuestAnalytics(
    @Args('hotelId', { type: () => ID }) hotelId: string,
    @Args('period', { nullable: true, defaultValue: '30d' }) period?: string,
  ) {
    return this.analyticsService.getGuestAnalytics(hotelId, period);
  }
}
