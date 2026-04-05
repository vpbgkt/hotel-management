/**
 * Analytics Service - Hotel Manager API
 *
 * Provides comprehensive analytics for hotel admins and platform admins.
 * Revenue tracking, occupancy analysis, booking trends, and guest insights.
 */

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly CACHE_TTL = 600; // 10 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ============================================
  // Hotel Analytics
  // ============================================

  /**
   * Revenue analytics for a hotel
   */
  async getRevenueAnalytics(hotelId: string, period: string = '30d') {
    const cacheKey = `analytics:revenue:${hotelId}:${period}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const startDate = this.getStartDate(period);
    const previousStart = this.getPreviousStartDate(period);

    const [currentRevenue, previousRevenue, revenueBySource, dailyRevenue] =
      await Promise.all([
        this.prisma.booking.aggregate({
          _sum: { totalAmount: true },
          _count: true,
          where: {
            hotelId,
            createdAt: { gte: startDate },
            status: { notIn: ['CANCELLED'] },
            paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] },
          },
        }),
        this.prisma.booking.aggregate({
          _sum: { totalAmount: true },
          _count: true,
          where: {
            hotelId,
            createdAt: { gte: previousStart, lt: startDate },
            status: { notIn: ['CANCELLED'] },
            paymentStatus: { in: ['PAID', 'PARTIALLY_REFUNDED'] },
          },
        }),
        this.prisma.booking.groupBy({
          by: ['source'],
          _sum: { totalAmount: true },
          _count: true,
          where: {
            hotelId,
            createdAt: { gte: startDate },
            status: { notIn: ['CANCELLED'] },
          },
        }),
        this.getDailyRevenue(hotelId, startDate),
      ]);

    const result = {
      totalRevenue: currentRevenue._sum?.totalAmount || 0,
      bookingCount: currentRevenue._count,
      previousRevenue: previousRevenue._sum?.totalAmount || 0,
      previousBookingCount: previousRevenue._count,
      revenueGrowth: this.calculateGrowth(
        currentRevenue._sum?.totalAmount || 0,
        previousRevenue._sum?.totalAmount || 0,
      ),
      revenueBySource: revenueBySource.map((s) => ({
        source: s.source,
        revenue: s._sum.totalAmount || 0,
        bookings: s._count,
      })),
      dailyRevenue,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  /**
   * Occupancy analytics for a hotel
   */
  async getOccupancyAnalytics(hotelId: string, period: string = '30d') {
    const cacheKey = `analytics:occupancy:${hotelId}:${period}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const startDate = this.getStartDate(period);
    const days = this.getDayCount(period);

    // Get total rooms
    const totalRooms = await this.prisma.roomType.aggregate({
      _sum: { totalRooms: true },
      where: { hotelId, isActive: true },
    });

    const totalRoomCount = totalRooms._sum.totalRooms || 1;

    // Get room-nights booked
    const bookings = await this.prisma.booking.findMany({
      where: {
        hotelId,
        checkInDate: { gte: startDate },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
      },
      select: {
        checkInDate: true,
        checkOutDate: true,
        numRooms: true,
        bookingType: true,
      },
    });

    let totalRoomNights = 0;
    for (const b of bookings) {
      if (b.bookingType === 'DAILY' && b.checkOutDate) {
        const nights = Math.max(
          1,
          Math.ceil(
            (b.checkOutDate.getTime() - b.checkInDate.getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
        totalRoomNights += nights * b.numRooms;
      } else {
        totalRoomNights += b.numRooms; // Hourly = 1 room-day
      }
    }

    const maxRoomNights = totalRoomCount * days;
    const occupancyRate =
      maxRoomNights > 0
        ? Math.round((totalRoomNights / maxRoomNights) * 100)
        : 0;

    // Occupancy by room type
    const roomTypes = await this.prisma.roomType.findMany({
      where: { hotelId, isActive: true },
      select: { id: true, name: true, totalRooms: true },
    });

    const occupancyByRoomType = await Promise.all(
      roomTypes.map(async (rt) => {
        const rtBookings = await this.prisma.booking.count({
          where: {
            roomTypeId: rt.id,
            checkInDate: { gte: startDate },
            status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
          },
        });

        return {
          roomType: rt.name,
          totalRooms: rt.totalRooms,
          bookedRoomNights: rtBookings,
          occupancy: Math.round(
            (rtBookings / (rt.totalRooms * days)) * 100,
          ),
        };
      }),
    );

    const result = {
      totalRooms: totalRoomCount,
      totalRoomNights,
      maxRoomNights,
      occupancyRate,
      occupancyByRoomType,
      period,
    };

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  /**
   * Booking analytics for a hotel
   */
  async getBookingAnalytics(hotelId: string, period: string = '30d') {
    const cacheKey = `analytics:bookings:${hotelId}:${period}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const startDate = this.getStartDate(period);

    const [
      totalBookings,
      statusBreakdown,
      sourceBreakdown,
      typeBreakdown,
      avgBookingValue,
      cancellationRate,
      topRoomTypes,
    ] = await Promise.all([
      this.prisma.booking.count({
        where: { hotelId, createdAt: { gte: startDate } },
      }),
      this.prisma.booking.groupBy({
        by: ['status'],
        _count: true,
        where: { hotelId, createdAt: { gte: startDate } },
      }),
      this.prisma.booking.groupBy({
        by: ['source'],
        _count: true,
        _sum: { totalAmount: true },
        where: { hotelId, createdAt: { gte: startDate } },
      }),
      this.prisma.booking.groupBy({
        by: ['bookingType'],
        _count: true,
        where: { hotelId, createdAt: { gte: startDate } },
      }),
      this.prisma.booking.aggregate({
        _avg: { totalAmount: true },
        where: {
          hotelId,
          createdAt: { gte: startDate },
          status: { notIn: ['CANCELLED'] },
        },
      }),
      this.prisma.booking.count({
        where: {
          hotelId,
          createdAt: { gte: startDate },
          status: 'CANCELLED',
        },
      }),
      this.prisma.booking.groupBy({
        by: ['roomTypeId'],
        _count: true,
        _sum: { totalAmount: true },
        where: {
          hotelId,
          createdAt: { gte: startDate },
          status: { notIn: ['CANCELLED'] },
        },
        orderBy: { _count: { roomTypeId: 'desc' } },
        take: 5,
      }),
    ]);

    // Enrich room type names
    const rtIds = topRoomTypes.map((r) => r.roomTypeId);
    const roomTypes = await this.prisma.roomType.findMany({
      where: { id: { in: rtIds } },
      select: { id: true, name: true },
    });
    const rtMap = new Map(roomTypes.map((rt) => [rt.id, rt.name]));

    const result = {
      totalBookings,
      avgBookingValue: avgBookingValue._avg.totalAmount || 0,
      cancellationRate:
        totalBookings > 0
          ? Math.round((cancellationRate / totalBookings) * 100)
          : 0,
      statusBreakdown: statusBreakdown.map((s) => ({
        status: s.status,
        count: s._count,
      })),
      sourceBreakdown: sourceBreakdown.map((s) => ({
        source: s.source,
        count: s._count,
        revenue: s._sum.totalAmount || 0,
      })),
      typeBreakdown: typeBreakdown.map((t) => ({
        type: t.bookingType,
        count: t._count,
      })),
      topRoomTypes: topRoomTypes.map((r) => ({
        roomType: rtMap.get(r.roomTypeId) || 'Unknown',
        bookings: r._count,
        revenue: r._sum.totalAmount || 0,
      })),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  /**
   * Guest analytics for a hotel
   */
  async getGuestAnalytics(hotelId: string, period: string = '30d') {
    const cacheKey = `analytics:guests:${hotelId}:${period}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const startDate = this.getStartDate(period);

    const [totalGuests, newGuests, returningGuests, avgRating, topGuests] =
      await Promise.all([
        this.prisma.booking
          .findMany({
            where: {
              hotelId,
              createdAt: { gte: startDate },
              status: { notIn: ['CANCELLED'] },
            },
            distinct: ['guestId'],
            select: { guestId: true },
          })
          .then((r) => r.length),
        this.prisma.user.count({
          where: {
            createdAt: { gte: startDate },
            role: 'GUEST',
            bookings: { some: { hotelId } },
          },
        }),
        // Returning guests: booked more than once at this hotel
        this.prisma.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(DISTINCT "guestId") as count
          FROM "Booking"
          WHERE "hotelId" = ${hotelId}
            AND "createdAt" >= ${startDate}
            AND status != 'CANCELLED'
            AND "guestId" IN (
              SELECT "guestId" FROM "Booking"
              WHERE "hotelId" = ${hotelId}
              GROUP BY "guestId"
              HAVING COUNT(*) > 1
            )
        `.then((r) => Number(r[0]?.count || 0)),
        this.prisma.review.aggregate({
          _avg: { rating: true },
          where: { hotelId, createdAt: { gte: startDate } },
        }),
        // Top guests by spending
        this.prisma.booking.groupBy({
          by: ['guestId'],
          _sum: { totalAmount: true },
          _count: true,
          where: {
            hotelId,
            createdAt: { gte: startDate },
            status: { notIn: ['CANCELLED'] },
          },
          orderBy: { _sum: { totalAmount: 'desc' } },
          take: 10,
        }),
      ]);

    // Enrich top guests
    const guestIds = topGuests.map((g) => g.guestId);
    const guests = await this.prisma.user.findMany({
      where: { id: { in: guestIds } },
      select: { id: true, name: true, email: true },
    });
    const guestMap = new Map(guests.map((g) => [g.id, g]));

    const result = {
      totalGuests,
      newGuests,
      returningGuests,
      avgRating: avgRating._avg.rating || 0,
      topGuests: topGuests.map((g) => ({
        guestId: g.guestId,
        name: guestMap.get(g.guestId)?.name || 'Unknown',
        email: guestMap.get(g.guestId)?.email || '',
        totalSpent: g._sum.totalAmount || 0,
        bookingCount: g._count,
      })),
    };

    await this.redis.set(cacheKey, JSON.stringify(result), this.CACHE_TTL);
    return result;
  }

  // ============================================
  // ============================================
  // Helper Methods
  // ============================================

  private async getDailyRevenue(hotelId: string | undefined, startDate: Date) {
    const where: any = {
      createdAt: { gte: startDate },
      status: { notIn: ['CANCELLED'] },
    };
    if (hotelId) where.hotelId = hotelId;

    const bookings = await this.prisma.booking.findMany({
      where,
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: 'asc' },
    });

    const dailyMap = new Map<string, number>();
    for (const b of bookings) {
      const day = b.createdAt.toISOString().slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) || 0) + b.totalAmount);
    }

    return Array.from(dailyMap.entries()).map(([date, revenue]) => ({
      date,
      revenue,
    }));
  }

  private getStartDate(period: string): Date {
    const now = new Date();
    const match = period.match(/^(\d+)(d|w|m|y)$/);
    if (!match) return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [, numStr, unit] = match;
    const num = parseInt(numStr);

    switch (unit) {
      case 'd':
        return new Date(now.getTime() - num * 24 * 60 * 60 * 1000);
      case 'w':
        return new Date(now.getTime() - num * 7 * 24 * 60 * 60 * 1000);
      case 'm':
        return new Date(now.getFullYear(), now.getMonth() - num, now.getDate());
      case 'y':
        return new Date(now.getFullYear() - num, now.getMonth(), now.getDate());
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private getPreviousStartDate(period: string): Date {
    const startDate = this.getStartDate(period);
    const now = new Date();
    const diff = now.getTime() - startDate.getTime();
    return new Date(startDate.getTime() - diff);
  }

  private getDayCount(period: string): number {
    const startDate = this.getStartDate(period);
    return Math.ceil(
      (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
}
