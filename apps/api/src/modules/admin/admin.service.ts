import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { UpdateHotelInput, CreateRoomTypeInput, UpdateRoomTypeInput, BulkInventoryUpdateInput, SingleDateInventoryInput } from './dto/admin.input';
import { addDays, differenceInDays, format } from 'date-fns';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ============================================
  // Dashboard Stats
  // ============================================

  async getDashboardStats(hotelId: string) {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalBookings,
      monthlyBookings,
      todayCheckIns,
      todayCheckOuts,
      revenueResult,
      monthlyRevenue,
      totalRooms,
      occupiedRooms,
      recentBookings,
    ] = await Promise.all([
      // Total bookings count
      this.prisma.booking.count({
        where: { hotelId, status: { not: 'CANCELLED' } },
      }),
      // This month's bookings
      this.prisma.booking.count({
        where: {
          hotelId,
          createdAt: { gte: monthStart },
          status: { not: 'CANCELLED' },
        },
      }),
      // Today's check-ins
      this.prisma.booking.count({
        where: {
          hotelId,
          checkInDate: { gte: todayStart, lt: todayEnd },
          status: { in: ['CONFIRMED', 'CHECKED_IN'] },
        },
      }),
      // Today's check-outs
      this.prisma.booking.count({
        where: {
          hotelId,
          checkOutDate: { gte: todayStart, lt: todayEnd },
          status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
        },
      }),
      // Total revenue
      this.prisma.booking.aggregate({
        where: { hotelId, paymentStatus: 'PAID' },
        _sum: { totalAmount: true },
      }),
      // Monthly revenue
      this.prisma.booking.aggregate({
        where: {
          hotelId,
          paymentStatus: 'PAID',
          createdAt: { gte: monthStart },
        },
        _sum: { totalAmount: true },
      }),
      // Total rooms
      this.prisma.room.count({ where: { hotelId } }),
      // Occupied rooms (currently checked in)
      this.prisma.booking.count({
        where: { hotelId, status: 'CHECKED_IN' },
      }),
      // Recent bookings
      this.prisma.booking.findMany({
        where: { hotelId },
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          roomType: { select: { name: true } },
        },
      }),
    ]);

    const occupancyRate = totalRooms > 0
      ? Math.round((occupiedRooms / totalRooms) * 100)
      : 0;

    return {
      totalBookings,
      monthlyBookings,
      todayCheckIns,
      todayCheckOuts,
      totalRevenue: revenueResult._sum.totalAmount || 0,
      monthlyRevenue: monthlyRevenue._sum.totalAmount || 0,
      totalRooms,
      occupiedRooms,
      occupancyRate,
      recentBookings,
    };
  }

  // ============================================
  // Hotel Management
  // ============================================

  async updateHotel(input: UpdateHotelInput) {
    const { hotelId, ...updateData } = input;

    // Check hotel exists
    const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) {
      throw new NotFoundException(`Hotel ${hotelId} not found`);
    }

    // Filter out undefined values
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        data[key] = value;
      }
    }

    const updated = await this.prisma.hotel.update({
      where: { id: hotelId },
      data,
      include: {
        roomTypes: { where: { isActive: true }, orderBy: { sortOrder: 'asc' } },
      },
    });

    // Invalidate cache
    await this.redis.delPattern(`hotel:*`);
    await this.redis.delPattern(`hotels:*`);

    return updated;
  }

  // ============================================
  // Room Type CRUD
  // ============================================

  async createRoomType(input: CreateRoomTypeInput) {
    const { hotelId, ...data } = input;

    // Verify hotel exists
    const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) {
      throw new NotFoundException(`Hotel ${hotelId} not found`);
    }

    const roomType = await this.prisma.roomType.create({
      data: {
        hotelId,
        ...data,
      },
    });

    // Create physical rooms based on totalRooms
    if (data.totalRooms > 0) {
      const rooms = Array.from({ length: data.totalRooms }, (_, i) => ({
        hotelId,
        roomTypeId: roomType.id,
        roomNumber: `${roomType.name.replace(/\s+/g, '').slice(0, 3).toUpperCase()}${String(i + 1).padStart(2, '0')}`,
        floor: 1,
      }));

      await this.prisma.room.createMany({ data: rooms });
    }

    // Invalidate cache
    await this.redis.delPattern(`hotel:*`);
    await this.redis.delPattern(`room-types:*`);

    return roomType;
  }

  async updateRoomType(input: UpdateRoomTypeInput) {
    const { id, ...updateData } = input;

    const roomType = await this.prisma.roomType.findUnique({ where: { id } });
    if (!roomType) {
      throw new NotFoundException(`Room type ${id} not found`);
    }

    // Filter out undefined values
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updateData)) {
      if (value !== undefined) {
        data[key] = value;
      }
    }

    const updated = await this.prisma.roomType.update({
      where: { id },
      data,
    });

    // Invalidate cache
    await this.redis.delPattern(`hotel:*`);
    await this.redis.delPattern(`room-types:*`);

    return updated;
  }

  async deleteRoomType(id: string) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id },
      include: { bookings: { where: { status: { in: ['CONFIRMED', 'CHECKED_IN'] } }, take: 1 } },
    });

    if (!roomType) {
      throw new NotFoundException(`Room type ${id} not found`);
    }

    if (roomType.bookings.length > 0) {
      throw new ForbiddenException('Cannot delete room type with active bookings. Deactivate it instead.');
    }

    // Soft delete - just deactivate
    await this.prisma.roomType.update({
      where: { id },
      data: { isActive: false },
    });

    // Invalidate cache
    await this.redis.delPattern(`hotel:*`);
    await this.redis.delPattern(`room-types:*`);

    return { success: true, message: 'Room type deactivated successfully' };
  }

  async getRoomTypesForAdmin(hotelId: string) {
    // Admin sees ALL room types including inactive
    return this.prisma.roomType.findMany({
      where: { hotelId },
      orderBy: { sortOrder: 'asc' },
      include: {
        rooms: { select: { id: true, roomNumber: true, status: true } },
        _count: { select: { bookings: true } },
      },
    });
  }

  // ============================================
  // Inventory / Pricing Management
  // ============================================

  async bulkUpdateInventory(input: BulkInventoryUpdateInput) {
    const { roomTypeId, startDate, endDate, priceOverride, availableCount, isClosed, minStayNights } = input;

    // Verify room type exists
    const roomType = await this.prisma.roomType.findUnique({ where: { id: roomTypeId } });
    if (!roomType) {
      throw new NotFoundException(`Room type ${roomTypeId} not found`);
    }

    const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
    if (days <= 0 || days > 365) {
      throw new ForbiddenException('Date range must be 1-365 days');
    }

    const upsertOps = [];
    for (let i = 0; i < days; i++) {
      const date = addDays(new Date(startDate), i);
      // Normalize to date-only (midnight UTC)
      const dateOnly = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));

      const updateData: Record<string, unknown> = {};
      if (priceOverride !== undefined) updateData.priceOverride = priceOverride;
      if (availableCount !== undefined) updateData.availableCount = availableCount;
      if (isClosed !== undefined) updateData.isClosed = isClosed;
      if (minStayNights !== undefined) updateData.minStayNights = minStayNights;

      upsertOps.push(
        this.prisma.roomInventory.upsert({
          where: {
            roomTypeId_date: { roomTypeId, date: dateOnly },
          },
          update: updateData,
          create: {
            roomTypeId,
            date: dateOnly,
            availableCount: availableCount ?? roomType.totalRooms,
            priceOverride: priceOverride ?? null,
            isClosed: isClosed ?? false,
            minStayNights: minStayNights ?? 1,
          },
        }),
      );
    }

    await this.prisma.$transaction(upsertOps);

    // Invalidate cache
    await this.redis.delPattern(`availability:${roomTypeId}:*`);
    await this.redis.delPattern(`hotel:*`);

    return {
      success: true,
      message: `Updated ${days} day(s) of inventory for room type`,
      daysUpdated: days,
    };
  }

  async updateSingleDateInventory(input: SingleDateInventoryInput) {
    const { roomTypeId, date, priceOverride, availableCount, isClosed, minStayNights } = input;

    const roomType = await this.prisma.roomType.findUnique({ where: { id: roomTypeId } });
    if (!roomType) {
      throw new NotFoundException(`Room type ${roomTypeId} not found`);
    }

    const dateOnly = new Date(Date.UTC(
      new Date(date).getFullYear(),
      new Date(date).getMonth(),
      new Date(date).getDate(),
    ));

    const updateData: Record<string, unknown> = {};
    if (priceOverride !== undefined) updateData.priceOverride = priceOverride;
    if (availableCount !== undefined) updateData.availableCount = availableCount;
    if (isClosed !== undefined) updateData.isClosed = isClosed;
    if (minStayNights !== undefined) updateData.minStayNights = minStayNights;

    const inventory = await this.prisma.roomInventory.upsert({
      where: {
        roomTypeId_date: { roomTypeId, date: dateOnly },
      },
      update: updateData,
      create: {
        roomTypeId,
        date: dateOnly,
        availableCount: availableCount ?? roomType.totalRooms,
        priceOverride: priceOverride ?? null,
        isClosed: isClosed ?? false,
        minStayNights: minStayNights ?? 1,
      },
    });

    // Invalidate cache
    await this.redis.delPattern(`availability:${roomTypeId}:*`);

    return inventory;
  }

  async getInventoryForDateRange(roomTypeId: string, startDate: Date, endDate: Date) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: {
        inventory: {
          where: {
            date: { gte: startDate, lte: endDate },
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!roomType) {
      throw new NotFoundException(`Room type ${roomTypeId} not found`);
    }

    const days = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
    const calendar = [];

    for (let i = 0; i < days; i++) {
      const date = addDays(new Date(startDate), i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const inv = roomType.inventory.find(
        (inv) => format(new Date(inv.date), 'yyyy-MM-dd') === dateStr,
      );

      calendar.push({
        date: dateStr,
        available: inv?.availableCount ?? roomType.totalRooms,
        price: inv?.priceOverride ?? roomType.basePriceDaily,
        basePrice: roomType.basePriceDaily,
        isClosed: inv?.isClosed ?? false,
        minStayNights: inv?.minStayNights ?? 1,
        hasCustomPrice: inv?.priceOverride !== null && inv?.priceOverride !== undefined,
        hasCustomAvailability: inv !== undefined,
      });
    }

    return {
      roomTypeId,
      roomTypeName: roomType.name,
      basePriceDaily: roomType.basePriceDaily,
      totalRooms: roomType.totalRooms,
      calendar,
    };
  }

  // ============================================
  // Analytics
  // ============================================

  async getAnalytics(hotelId: string, months: number = 6) {
    const now = new Date();

    // Compute monthly revenue and booking counts for the last N months
    const monthlyData = [];
    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

      const [bookingCount, revenueResult] = await Promise.all([
        this.prisma.booking.count({
          where: {
            hotelId,
            createdAt: { gte: monthStart, lte: monthEnd },
            status: { not: 'CANCELLED' },
          },
        }),
        this.prisma.booking.aggregate({
          where: {
            hotelId,
            createdAt: { gte: monthStart, lte: monthEnd },
            paymentStatus: 'PAID',
          },
          _sum: { totalAmount: true },
        }),
      ]);

      monthlyData.push({
        month: format(monthStart, 'MMM yyyy'),
        bookings: bookingCount,
        revenue: revenueResult._sum.totalAmount || 0,
      });
    }

    // Room type popularity (by booking count)
    const roomTypeStats = await this.prisma.roomType.findMany({
      where: { hotelId },
      select: {
        id: true,
        name: true,
        basePriceDaily: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { bookings: { _count: 'desc' } },
    });

    const roomTypePopularity = roomTypeStats.map((rt) => ({
      roomTypeName: rt.name,
      bookings: rt._count.bookings,
      revenue: 0, // Will compute below
    }));

    // Revenue by room type
    for (const rt of roomTypePopularity) {
      const result = await this.prisma.booking.aggregate({
        where: {
          hotelId,
          roomType: { name: rt.roomTypeName },
          paymentStatus: 'PAID',
        },
        _sum: { totalAmount: true },
      });
      rt.revenue = result._sum.totalAmount || 0;
    }

    // Booking source distribution
    const sourceGroups = await this.prisma.booking.groupBy({
      by: ['source'],
      where: { hotelId, status: { not: 'CANCELLED' } },
      _count: true,
    });

    const bookingsBySource = sourceGroups.map((sg) => ({
      source: sg.source,
      count: sg._count,
    }));

    // Status distribution
    const statusGroups = await this.prisma.booking.groupBy({
      by: ['status'],
      where: { hotelId },
      _count: true,
    });

    const bookingsByStatus = statusGroups.map((sg) => ({
      status: sg.status,
      count: sg._count,
    }));

    // Average booking value
    const avgBooking = await this.prisma.booking.aggregate({
      where: { hotelId, paymentStatus: 'PAID' },
      _avg: { totalAmount: true },
    });

    // Average stay duration
    const bookingsWithDates = await this.prisma.booking.findMany({
      where: { hotelId, bookingType: 'DAILY', status: { not: 'CANCELLED' } },
      select: { checkInDate: true, checkOutDate: true },
    });

    let avgStayNights = 0;
    if (bookingsWithDates.length > 0) {
      const totalNights = bookingsWithDates.reduce((sum, b) => {
        if (!b.checkOutDate || !b.checkInDate) return sum;
        return sum + differenceInDays(new Date(b.checkOutDate), new Date(b.checkInDate));
      }, 0);
      avgStayNights = Math.round((totalNights / bookingsWithDates.length) * 10) / 10;
    }

    return {
      monthlyData,
      roomTypePopularity,
      bookingsBySource,
      bookingsByStatus,
      averageBookingValue: avgBooking._avg.totalAmount || 0,
      averageStayNights: avgStayNights,
    };
  }

  // ============================================
  // SEO Meta Management
  // ============================================

  async getSeoMetaForHotel(hotelId: string) {
    return this.prisma.sEOMeta.findMany({
      where: { hotelId },
      orderBy: { pageSlug: 'asc' },
    });
  }

  async upsertSeoMeta(input: {
    hotelId: string;
    pageSlug: string;
    metaTitle?: string;
    metaDescription?: string;
    ogImageUrl?: string;
    canonicalUrl?: string;
    customJsonLd?: any;
  }) {
    const { hotelId, pageSlug, ...data } = input;

    const result = await this.prisma.sEOMeta.upsert({
      where: { hotelId_pageSlug: { hotelId, pageSlug } },
      create: { hotelId, pageSlug, ...data },
      update: data,
    });

    // Invalidate cache
    await this.redis.del(`hotel:seo:${hotelId}:${pageSlug}`);

    return result;
  }

  async deleteSeoMeta(id: string) {
    const meta = await this.prisma.sEOMeta.findUnique({ where: { id } });
    if (!meta) throw new NotFoundException('SEO meta not found');
    
    await this.prisma.sEOMeta.delete({ where: { id } });
    await this.redis.del(`hotel:seo:${meta.hotelId}:${meta.pageSlug}`);
    
    return { success: true, message: 'SEO meta deleted' };
  }

  // ============================================
  // Content / Theme Management
  // ============================================

  async getHotelContent(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      select: {
        id: true,
        name: true,
        description: true,
        heroImageUrl: true,
        logoUrl: true,
        themeConfig: true,
      },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');
    return hotel;
  }

  async updateHotelContent(hotelId: string, data: {
    description?: string;
    heroImageUrl?: string;
    logoUrl?: string;
    themeConfig?: any;
  }) {
    const hotel = await this.prisma.hotel.update({
      where: { id: hotelId },
      data,
    });

    // Invalidate caches
    await this.redis.del(`hotel:${hotelId}`);
    const hotelData = await this.prisma.hotel.findUnique({ where: { id: hotelId }, select: { slug: true } });
    if (hotelData?.slug) {
      await this.redis.del(`hotel:slug:${hotelData.slug}`);
    }

    return hotel;
  }

  // ============================================
  // Staff Management
  // ============================================

  async getStaffMembers(hotelId: string) {
    return this.prisma.user.findMany({
      where: {
        hotelId,
        role: { in: ['HOTEL_ADMIN', 'HOTEL_STAFF'] },
      },
      include: { staffPermission: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createStaffMember(
    hotelId: string,
    data: { name: string; email: string; phone?: string; password: string; permissions?: any },
  ) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: data.email }, ...(data.phone ? [{ phone: data.phone }] : [])] },
    });
    if (existing) {
      throw new ForbiddenException('A user with this email or phone already exists');
    }

    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash(data.password, 12);

    return this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        password: hashedPassword,
        role: 'HOTEL_STAFF',
        hotelId,
        emailVerified: true,
        staffPermission: {
          create: data.permissions || {},
        },
      },
      include: { staffPermission: true },
    });
  }

  async updateStaffMember(
    hotelId: string,
    staffId: string,
    data: { name?: string; email?: string; phone?: string; isActive?: boolean; permissions?: any },
  ) {
    const staff = await this.prisma.user.findFirst({
      where: { id: staffId, hotelId, role: 'HOTEL_STAFF' },
    });
    if (!staff) throw new NotFoundException('Staff member not found');

    const { permissions, ...userData } = data;

    const updated = await this.prisma.user.update({
      where: { id: staffId },
      data: {
        ...Object.fromEntries(Object.entries(userData).filter(([, v]) => v !== undefined)),
        ...(permissions
          ? {
              staffPermission: {
                upsert: {
                  create: permissions,
                  update: permissions,
                },
              },
            }
          : {}),
      },
      include: { staffPermission: true },
    });

    return updated;
  }

  async deleteStaffMember(hotelId: string, staffId: string) {
    const staff = await this.prisma.user.findFirst({
      where: { id: staffId, hotelId, role: 'HOTEL_STAFF' },
    });
    if (!staff) throw new NotFoundException('Staff member not found');

    await this.prisma.user.delete({ where: { id: staffId } });
    return { success: true, message: 'Staff member deleted' };
  }

  // ============================================
  // Setup Wizard
  // ============================================

  async getSetupStatus(hotelId: string) {
    const hotel = await this.prisma.hotel.findUnique({
      where: { id: hotelId },
      include: {
        roomTypes: { select: { id: true } },
        media: { select: { id: true } },
      },
    });
    if (!hotel) throw new NotFoundException('Hotel not found');

    return {
      hotelId: hotel.id,
      setupCompleted: hotel.setupCompleted,
      steps: {
        basicInfo: Boolean(hotel.name && hotel.address && hotel.city),
        contactInfo: Boolean(hotel.email || hotel.phone),
        rooms: hotel.roomTypes.length > 0,
        gallery: hotel.media.length > 0,
        policies: Boolean(hotel.checkInTime && hotel.checkOutTime),
      },
    };
  }

  async completeSetup(hotelId: string) {
    return this.prisma.hotel.update({
      where: { id: hotelId },
      data: { setupCompleted: true },
    });
  }
}
