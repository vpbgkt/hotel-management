import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { 
  CheckAvailabilityInput, 
  CheckHourlyAvailabilityInput, 
  RoomTypeFiltersInput 
} from './dto/room-availability.input';
import { Prisma } from '@prisma/client';
import { addDays, differenceInDays, format, parseISO } from 'date-fns';

@Injectable()
export class RoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private readonly CACHE_TTL = 60; // 1 minute for availability (real-time data)

  /**
   * Get room types for a hotel
   */
  async getRoomTypes(hotelId: string, filters?: RoomTypeFiltersInput) {
    const cacheKey = `room-types:${hotelId}:${JSON.stringify(filters || {})}`;

    return this.redis.cacheOrFetch(
      cacheKey,
      async () => {
        const where: Prisma.RoomTypeWhereInput = {
          hotelId,
          isActive: true,
        };

        if (filters?.minGuests) {
          where.maxGuests = { gte: filters.minGuests };
        }

        if (filters?.minPrice !== undefined) {
          where.basePriceDaily = { gte: filters.minPrice };
        }

        if (filters?.maxPrice !== undefined) {
          where.basePriceDaily = { ...(where.basePriceDaily as object || {}), lte: filters.maxPrice };
        }

        if (filters?.amenities?.length) {
          where.amenities = { hasSome: filters.amenities };
        }

        if (filters?.includeHourly) {
          where.basePriceHourly = { not: null };
        }

        const roomTypes = await this.prisma.roomType.findMany({
          where,
          orderBy: { sortOrder: 'asc' },
          include: {
            rooms: {
              where: { status: 'AVAILABLE' },
              select: { id: true },
            },
          },
        });

        return roomTypes.map((rt) => ({
          ...rt,
          availableRoomsCount: rt.rooms.length,
        }));
      },
      this.CACHE_TTL,
    );
  }

  /**
   * Get room type by ID
   */
  async getRoomTypeById(id: string) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id },
      include: {
        hotel: {
          select: { name: true, slug: true },
        },
        rooms: {
          where: { status: 'AVAILABLE' },
        },
      },
    });

    if (!roomType) {
      throw new NotFoundException(`Room type ${id} not found`);
    }

    return roomType;
  }

  /**
   * Check daily availability for a date range
   */
  async checkDailyAvailability(input: CheckAvailabilityInput) {
    const { hotelId, roomTypeId, checkInDate, checkOutDate, numRooms = 1 } = input;

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = checkOutDate ? new Date(checkOutDate) : addDays(checkIn, 1);
    const nights = differenceInDays(checkOut, checkIn);

    if (nights < 1) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    // Build room type filter
    const roomTypeWhere: Prisma.RoomTypeWhereInput = {
      hotelId,
      isActive: true,
      ...(roomTypeId && { id: roomTypeId }),
    };

    // Get all applicable room types
    const roomTypes = await this.prisma.roomType.findMany({
      where: roomTypeWhere,
      include: {
        inventory: {
          where: {
            date: {
              gte: checkIn,
              lt: checkOut,
            },
          },
        },
      },
    });

    // Process availability for each room type
    const availability = roomTypes.map((rt) => {
      // For each night in the range, find the minimum availability
      const dates: { date: Date; available: number; price: number; isClosed: boolean }[] = [];
      
      for (let i = 0; i < nights; i++) {
        const date = addDays(checkIn, i);
        const dateStr = format(date, 'yyyy-MM-dd');
        
        // Find inventory for this date
        const inv = rt.inventory.find(
          (inv) => format(new Date(inv.date), 'yyyy-MM-dd') === dateStr
        );

        if (inv) {
          dates.push({
            date,
            available: inv.availableCount,
            price: inv.priceOverride ?? rt.basePriceDaily,
            isClosed: inv.isClosed,
          });
        } else {
          // No specific inventory - use total rooms
          dates.push({
            date,
            available: rt.totalRooms,
            price: rt.basePriceDaily,
            isClosed: false,
          });
        }
      }

      // Calculate overall availability (minimum across all nights)
      const minAvailable = Math.min(...dates.map((d) => d.available));
      const hasClosedDates = dates.some((d) => d.isClosed);
      const totalPrice = dates.reduce((sum, d) => sum + d.price, 0);

      return {
        roomType: {
          id: rt.id,
          name: rt.name,
          slug: rt.slug,
          basePriceDaily: rt.basePriceDaily,
          maxGuests: rt.maxGuests,
          amenities: rt.amenities,
          images: rt.images,
        },
        nights,
        dates,
        minAvailable,
        isAvailable: minAvailable >= numRooms && !hasClosedDates,
        totalPrice: totalPrice * numRooms,
        pricePerNight: totalPrice / nights,
      };
    });

    return {
      hotelId,
      checkIn,
      checkOut,
      nights,
      numRooms,
      roomTypes: availability.filter((a) => a.isAvailable),
      unavailableRoomTypes: availability.filter((a) => !a.isAvailable),
    };
  }

  /**
   * Check hourly availability for a specific date
   */
  async checkHourlyAvailability(input: CheckHourlyAvailabilityInput) {
    const { hotelId, roomTypeId, date, startTime, numHours = 3, numRooms = 1 } = input;

    const targetDate = new Date(date);
    const dateStr = format(targetDate, 'yyyy-MM-dd');

    // Build room type filter
    const roomTypeWhere: Prisma.RoomTypeWhereInput = {
      hotelId,
      isActive: true,
      basePriceHourly: { not: null },
      ...(roomTypeId && { id: roomTypeId }),
    };

    // Get room types with hourly pricing
    const roomTypes = await this.prisma.roomType.findMany({
      where: roomTypeWhere,
      include: {
        hotel: {
          select: { hourlyMinHours: true, hourlyMaxHours: true },
        },
        hourlySlots: {
          where: {
            date: targetDate,
          },
        },
      },
    });

    // Generate available time slots
    const availability = roomTypes.map((rt) => {
      const minHours = rt.minHours ?? rt.hotel.hourlyMinHours;
      const maxHours = rt.maxHours ?? rt.hotel.hourlyMaxHours;

      // If numHours is outside allowed range, mark as unavailable
      if (numHours < minHours || numHours > maxHours) {
        return {
          roomType: {
            id: rt.id,
            name: rt.name,
            basePriceHourly: rt.basePriceHourly,
          },
          slots: [],
          isAvailable: false,
          message: `Booking must be between ${minHours} and ${maxHours} hours`,
        };
      }

      // Generate time slots (e.g., 8:00, 9:00, 10:00, etc.)
      const slots: { 
        startTime: string; 
        endTime: string; 
        available: number; 
        price: number;
        isClosed: boolean;
      }[] = [];

      // Generate slots from 6:00 AM to 10:00 PM
      for (let hour = 6; hour <= 22 - numHours; hour++) {
        const slotStart = `${hour.toString().padStart(2, '0')}:00`;
        const slotEnd = `${(hour + numHours).toString().padStart(2, '0')}:00`;

        // Check if there's a specific slot entry
        const existingSlot = rt.hourlySlots.find(
          (s) => s.slotStart === slotStart && s.slotEnd === slotEnd
        );

        if (existingSlot) {
          slots.push({
            startTime: slotStart,
            endTime: slotEnd,
            available: existingSlot.availableCount,
            price: (existingSlot.priceOverride ?? rt.basePriceHourly!) * numHours,
            isClosed: existingSlot.isClosed,
          });
        } else {
          // Default availability based on total rooms
          slots.push({
            startTime: slotStart,
            endTime: slotEnd,
            available: rt.totalRooms,
            price: rt.basePriceHourly! * numHours,
            isClosed: false,
          });
        }
      }

      // Filter to only available slots
      const availableSlots = slots.filter((s) => s.available >= numRooms && !s.isClosed);

      // If startTime is specified, filter to that slot
      const filteredSlots = startTime 
        ? availableSlots.filter((s) => s.startTime === startTime)
        : availableSlots;

      return {
        roomType: {
          id: rt.id,
          name: rt.name,
          basePriceHourly: rt.basePriceHourly,
          amenities: rt.amenities,
          images: rt.images,
        },
        minHours,
        maxHours,
        slots: filteredSlots,
        isAvailable: filteredSlots.length > 0,
      };
    });

    return {
      hotelId,
      date: targetDate,
      numHours,
      numRooms,
      roomTypes: availability.filter((a) => a.isAvailable),
      unavailableRoomTypes: availability.filter((a) => !a.isAvailable),
    };
  }

  /**
   * Get calendar view of availability for a room type
   */
  async getAvailabilityCalendar(roomTypeId: string, startDate: Date, endDate: Date) {
    const cacheKey = `availability:${roomTypeId}:${format(startDate, 'yyyy-MM-dd')}:${format(endDate, 'yyyy-MM-dd')}`;

    return this.redis.cacheOrFetch(
      cacheKey,
      async () => {
        const roomType = await this.prisma.roomType.findUnique({
          where: { id: roomTypeId },
          include: {
            inventory: {
              where: {
                date: {
                  gte: startDate,
                  lte: endDate,
                },
              },
              orderBy: { date: 'asc' },
            },
          },
        });

        if (!roomType) {
          throw new NotFoundException(`Room type ${roomTypeId} not found`);
        }

        // Generate calendar entries
        const calendar: { 
          date: string; 
          available: number; 
          price: number; 
          isClosed: boolean 
        }[] = [];

        const days = differenceInDays(endDate, startDate) + 1;

        for (let i = 0; i < days; i++) {
          const date = addDays(startDate, i);
          const dateStr = format(date, 'yyyy-MM-dd');

          const inv = roomType.inventory.find(
            (inv) => format(new Date(inv.date), 'yyyy-MM-dd') === dateStr
          );

          calendar.push({
            date: dateStr,
            available: inv?.availableCount ?? roomType.totalRooms,
            price: inv?.priceOverride ?? roomType.basePriceDaily,
            isClosed: inv?.isClosed ?? false,
          });
        }

        return {
          roomTypeId,
          roomTypeName: roomType.name,
          basePriceDaily: roomType.basePriceDaily,
          totalRooms: roomType.totalRooms,
          calendar,
        };
      },
      this.CACHE_TTL,
    );
  }
}
