import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { addDays, format, differenceInDays, isWeekend, startOfDay } from 'date-fns';

/**
 * Smart Pricing Engine
 * 
 * Analyzes occupancy, demand patterns, day-of-week trends, and seasonality
 * to generate price suggestions for hotel room types.
 */

export interface PriceSuggestion {
  date: string;
  currentPrice: number;
  suggestedPrice: number;
  changePercent: number;
  reason: string;
  occupancyRate: number;
  demandLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'PEAK';
}

export interface PricingAnalysis {
  roomTypeId: string;
  roomTypeName: string;
  basePrice: number;
  period: { from: string; to: string };
  averageOccupancy: number;
  revenue: { current: number; projected: number; uplift: number };
  suggestions: PriceSuggestion[];
}

@Injectable()
export class SmartPricingService {
  private readonly logger = new Logger(SmartPricingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate pricing suggestions for a room type over a date range
   */
  async generatePriceSuggestions(
    roomTypeId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<PricingAnalysis> {
    const roomType = await this.prisma.roomType.findUniqueOrThrow({
      where: { id: roomTypeId },
      include: {
        hotel: { select: { id: true, name: true, city: true } },
      },
    });

    const days = differenceInDays(toDate, fromDate);
    if (days <= 0 || days > 90) {
      throw new Error('Date range must be between 1 and 90 days');
    }

    // Fetch existing inventory for the period
    const inventory = await this.prisma.roomInventory.findMany({
      where: {
        roomTypeId,
        date: { gte: startOfDay(fromDate), lte: startOfDay(toDate) },
      },
      orderBy: { date: 'asc' },
    });
    const inventoryMap = new Map(
      inventory.map((inv) => [format(inv.date, 'yyyy-MM-dd'), inv]),
    );

    // Fetch historical booking data (last 90 days) for demand analysis
    const historicalBookings = await this.prisma.booking.groupBy({
      by: ['checkInDate'],
      where: {
        roomTypeId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
        checkInDate: {
          gte: addDays(new Date(), -90),
          lte: new Date(),
        },
      },
      _count: { id: true },
    });

    // Compute day-of-week demand pattern
    const dayOfWeekDemand = this.computeDayOfWeekDemand(historicalBookings);

    // Calculate average occupancy from recent data
    const recentInventory = await this.prisma.roomInventory.findMany({
      where: {
        roomTypeId,
        date: { gte: addDays(new Date(), -30), lte: new Date() },
      },
    });
    const avgOccupancy = this.computeAverageOccupancy(
      recentInventory,
      roomType.totalRooms,
    );

    // Generate suggestions for each day
    const suggestions: PriceSuggestion[] = [];
    let currentRevenue = 0;
    let projectedRevenue = 0;

    for (let i = 0; i < days; i++) {
      const date = addDays(fromDate, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const inv = inventoryMap.get(dateStr);

      const currentPrice = inv?.priceOverride ?? roomType.basePriceDaily;
      const booked = roomType.totalRooms - (inv?.availableCount ?? roomType.totalRooms);
      const occupancyRate = booked / roomType.totalRooms;

      // Determine demand level & price multiplier
      const { demandLevel, multiplier, reason } = this.analyzeDemand({
        date,
        occupancyRate,
        dayOfWeekDemand,
        basePrice: roomType.basePriceDaily,
        totalRooms: roomType.totalRooms,
      });

      // Calculate suggested price (round to nearest 50)
      const rawSuggested = roomType.basePriceDaily * multiplier;
      const suggestedPrice = Math.round(rawSuggested / 50) * 50;

      const changePercent =
        currentPrice > 0
          ? ((suggestedPrice - currentPrice) / currentPrice) * 100
          : 0;

      currentRevenue += currentPrice;
      projectedRevenue += suggestedPrice;

      suggestions.push({
        date: dateStr,
        currentPrice,
        suggestedPrice,
        changePercent: Math.round(changePercent * 10) / 10,
        reason,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
        demandLevel,
      });
    }

    return {
      roomTypeId,
      roomTypeName: roomType.name,
      basePrice: roomType.basePriceDaily,
      period: {
        from: format(fromDate, 'yyyy-MM-dd'),
        to: format(toDate, 'yyyy-MM-dd'),
      },
      averageOccupancy: Math.round(avgOccupancy * 100) / 100,
      revenue: {
        current: Math.round(currentRevenue),
        projected: Math.round(projectedRevenue),
        uplift: Math.round(projectedRevenue - currentRevenue),
      },
      suggestions,
    };
  }

  /**
   * Apply suggested prices to inventory (bulk update)
   */
  async applySuggestions(
    roomTypeId: string,
    suggestions: Array<{ date: string; price: number }>,
  ): Promise<{ applied: number; skipped: number }> {
    let applied = 0;
    let skipped = 0;

    for (const { date, price } of suggestions) {
      try {
        const dateObj = startOfDay(new Date(date));
        await this.prisma.roomInventory.upsert({
          where: {
            roomTypeId_date: { roomTypeId, date: dateObj },
          },
          update: { priceOverride: price },
          create: {
            roomTypeId,
            date: dateObj,
            availableCount: (
              await this.prisma.roomType.findUnique({
                where: { id: roomTypeId },
                select: { totalRooms: true },
              })
            )?.totalRooms ?? 0,
            priceOverride: price,
          },
        });
        applied++;
      } catch (error) {
        this.logger.warn(`Failed to apply price for ${date}: ${error}`);
        skipped++;
      }
    }

    this.logger.log(
      `Applied ${applied} price suggestions for roomType ${roomTypeId} (${skipped} skipped)`,
    );

    return { applied, skipped };
  }

  /**
   * Get occupancy forecast for the next N days
   */
  async getOccupancyForecast(
    hotelId: string,
    days: number = 30,
  ): Promise<Array<{ date: string; occupancyRate: number; revenue: number }>> {
    const roomTypes = await this.prisma.roomType.findMany({
      where: { hotelId, isActive: true },
      select: { id: true, totalRooms: true, basePriceDaily: true },
    });

    const totalRooms = roomTypes.reduce((sum, rt) => sum + rt.totalRooms, 0);
    const results: Array<{ date: string; occupancyRate: number; revenue: number }> = [];

    for (let i = 0; i < days; i++) {
      const date = addDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');

      // Count bookings that overlap this date
      const bookingCount = await this.prisma.booking.count({
        where: {
          hotelId,
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
          checkInDate: { lte: date },
          checkOutDate: { gt: date },
        },
      });

      const occ = totalRooms > 0 ? bookingCount / totalRooms : 0;

      // Estimate revenue from inventory prices
      const dayInventory = await this.prisma.roomInventory.findMany({
        where: {
          roomType: { hotelId },
          date: startOfDay(date),
        },
        include: { roomType: { select: { basePriceDaily: true } } },
      });

      const revenue = dayInventory.reduce((sum, inv) => {
        const price = inv.priceOverride ?? inv.roomType.basePriceDaily;
        const booked = inv.availableCount < 0 ? 0 : (inv.roomType as any).totalRooms - inv.availableCount;
        return sum + price * Math.max(booked, 0);
      }, 0);

      results.push({
        date: dateStr,
        occupancyRate: Math.round(occ * 100) / 100,
        revenue: Math.round(revenue),
      });
    }

    return results;
  }

  // ------- Private helpers -------

  private computeDayOfWeekDemand(
    bookings: Array<{ checkInDate: Date; _count: { id: number } }>,
  ): Map<number, number> {
    const demandByDay = new Map<number, number>();
    const countByDay = new Map<number, number>();

    for (const b of bookings) {
      const dow = b.checkInDate.getDay(); // 0=Sun to 6=Sat
      demandByDay.set(dow, (demandByDay.get(dow) || 0) + b._count.id);
      countByDay.set(dow, (countByDay.get(dow) || 0) + 1);
    }

    // Normalize to average per day-of-week
    const avgByDay = new Map<number, number>();
    for (let d = 0; d < 7; d++) {
      const total = demandByDay.get(d) || 0;
      const count = countByDay.get(d) || 1;
      avgByDay.set(d, total / count);
    }

    return avgByDay;
  }

  private computeAverageOccupancy(
    inventory: Array<{ availableCount: number }>,
    totalRooms: number,
  ): number {
    if (inventory.length === 0 || totalRooms === 0) return 0;
    const totalBooked = inventory.reduce(
      (sum, inv) => sum + Math.max(totalRooms - inv.availableCount, 0),
      0,
    );
    return totalBooked / (inventory.length * totalRooms);
  }

  private analyzeDemand(params: {
    date: Date;
    occupancyRate: number;
    dayOfWeekDemand: Map<number, number>;
    basePrice: number;
    totalRooms: number;
  }): { demandLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'PEAK'; multiplier: number; reason: string } {
    const { date, occupancyRate, dayOfWeekDemand, totalRooms } = params;
    const dow = date.getDay();
    const weekend = isWeekend(date);

    // Weekday/weekend base multiplier
    let multiplier = weekend ? 1.15 : 1.0;
    const reasons: string[] = [];

    if (weekend) {
      reasons.push('Weekend premium');
    }

    // Day-of-week demand pattern
    const avgDemand = dayOfWeekDemand.get(dow) || 0;
    const overallAvg =
      Array.from(dayOfWeekDemand.values()).reduce((a, b) => a + b, 0) / 7;
    if (overallAvg > 0) {
      const demandRatio = avgDemand / overallAvg;
      if (demandRatio > 1.3) {
        multiplier *= 1.1;
        reasons.push('High demand day');
      } else if (demandRatio < 0.7) {
        multiplier *= 0.9;
        reasons.push('Low demand day');
      }
    }

    // Occupancy-based pricing
    if (occupancyRate >= 0.9) {
      multiplier *= 1.3;
      reasons.push('Very high occupancy (90%+)');
    } else if (occupancyRate >= 0.75) {
      multiplier *= 1.15;
      reasons.push('High occupancy (75%+)');
    } else if (occupancyRate >= 0.5) {
      multiplier *= 1.05;
      reasons.push('Moderate occupancy');
    } else if (occupancyRate < 0.25) {
      multiplier *= 0.85;
      reasons.push('Low occupancy — discount to attract bookings');
    }

    // Lead time (days until date)
    const leadDays = differenceInDays(date, new Date());
    if (leadDays <= 2 && occupancyRate < 0.5) {
      multiplier *= 0.9;
      reasons.push('Last-minute deal');
    } else if (leadDays <= 2 && occupancyRate >= 0.75) {
      multiplier *= 1.2;
      reasons.push('Last-minute surge pricing');
    }

    // Determine demand level
    let demandLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'PEAK';
    if (multiplier >= 1.4) demandLevel = 'PEAK';
    else if (multiplier >= 1.15) demandLevel = 'HIGH';
    else if (multiplier >= 0.95) demandLevel = 'MEDIUM';
    else demandLevel = 'LOW';

    // Clamp multiplier
    multiplier = Math.max(0.7, Math.min(2.0, multiplier));

    return {
      demandLevel,
      multiplier,
      reason: reasons.join('; ') || 'Base pricing',
    };
  }
}
