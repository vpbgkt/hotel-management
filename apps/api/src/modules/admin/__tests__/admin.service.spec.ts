import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AdminService } from '../admin.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

describe('AdminService', () => {
  let service: AdminService;
  let mockPrisma: Record<string, any>;
  let mockRedis: Record<string, any>;

  beforeEach(async () => {
    mockPrisma = {
      hotel: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      roomType: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      room: {
        count: jest.fn(),
        createMany: jest.fn(),
      },
      booking: {
        count: jest.fn(),
        aggregate: jest.fn(),
        findMany: jest.fn(),
      },
      roomInventory: {
        upsert: jest.fn(),
      },
    };

    mockRedis = {
      del: jest.fn(),
      delPattern: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('updateHotel', () => {
    it('should throw NotFoundException if hotel not found', async () => {
      mockPrisma.hotel.findUnique.mockResolvedValue(null);

      await expect(
        service.updateHotel({ hotelId: 'non-existent', name: 'New Name' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update hotel and invalidate cache', async () => {
      const mockHotel = { id: 'hotel-1', name: 'Original' };
      mockPrisma.hotel.findUnique.mockResolvedValue(mockHotel);
      mockPrisma.hotel.update.mockResolvedValue({ ...mockHotel, name: 'Updated' });

      const result = await service.updateHotel({
        hotelId: 'hotel-1',
        name: 'Updated',
      } as any);

      expect(result.name).toBe('Updated');
      expect(mockRedis.delPattern).toHaveBeenCalledWith('hotel:*');
      expect(mockRedis.delPattern).toHaveBeenCalledWith('hotels:*');
    });
  });

  describe('createRoomType', () => {
    it('should throw NotFoundException if hotel not found', async () => {
      mockPrisma.hotel.findUnique.mockResolvedValue(null);

      await expect(
        service.createRoomType({
          hotelId: 'non-existent',
          name: 'Deluxe',
          totalRooms: 5,
          maxGuests: 2,
          maxExtraGuests: 1,
          basePriceDaily: 3000,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create room type and physical rooms', async () => {
      mockPrisma.hotel.findUnique.mockResolvedValue({ id: 'hotel-1' });
      mockPrisma.roomType.create.mockResolvedValue({
        id: 'rt-1',
        name: 'Deluxe',
        totalRooms: 3,
      });
      mockPrisma.room.createMany.mockResolvedValue({ count: 3 });

      const result = await service.createRoomType({
        hotelId: 'hotel-1',
        name: 'Deluxe',
        totalRooms: 3,
        maxGuests: 2,
        maxExtraGuests: 1,
        basePriceDaily: 3000,
      } as any);

      expect(result.name).toBe('Deluxe');
      expect(mockPrisma.room.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ roomNumber: 'DEL01' }),
          expect.objectContaining({ roomNumber: 'DEL02' }),
          expect.objectContaining({ roomNumber: 'DEL03' }),
        ]),
      });
    });
  });

  describe('updateRoomType', () => {
    it('should throw NotFoundException if room type not found', async () => {
      mockPrisma.roomType.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRoomType({ id: 'non-existent', name: 'Updated' } as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should update room type and invalidate cache', async () => {
      mockPrisma.roomType.findUnique.mockResolvedValue({ id: 'rt-1' });
      mockPrisma.roomType.update.mockResolvedValue({
        id: 'rt-1',
        name: 'Super Deluxe',
        basePriceDaily: 5000,
      });

      const result = await service.updateRoomType({
        id: 'rt-1',
        name: 'Super Deluxe',
        basePriceDaily: 5000,
      } as any);

      expect(result.name).toBe('Super Deluxe');
      expect(mockRedis.delPattern).toHaveBeenCalledWith('hotel:*');
    });
  });

  describe('deleteRoomType', () => {
    it('should throw NotFoundException if room type not found', async () => {
      mockPrisma.roomType.findUnique.mockResolvedValue(null);

      await expect(service.deleteRoomType('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject deletion if active bookings exist', async () => {
      mockPrisma.roomType.findUnique.mockResolvedValue({
        id: 'rt-1',
        bookings: [{ id: 'booking-1' }],
      });

      await expect(service.deleteRoomType('rt-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should soft-delete room type if no active bookings', async () => {
      mockPrisma.roomType.findUnique.mockResolvedValue({
        id: 'rt-1',
        bookings: [],
      });
      mockPrisma.roomType.update.mockResolvedValue({});

      const result = await service.deleteRoomType('rt-1');

      expect(result.success).toBe(true);
      expect(mockPrisma.roomType.update).toHaveBeenCalledWith({
        where: { id: 'rt-1' },
        data: { isActive: false },
      });
    });
  });

  describe('getDashboardStats', () => {
    it('should aggregate dashboard statistics', async () => {
      mockPrisma.booking.count
        .mockResolvedValueOnce(50) // totalBookings
        .mockResolvedValueOnce(12) // monthlyBookings
        .mockResolvedValueOnce(3) // todayCheckIns
        .mockResolvedValueOnce(2) // todayCheckOuts
        .mockResolvedValueOnce(5); // occupiedRooms

      mockPrisma.booking.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 500000 } }) // totalRevenue
        .mockResolvedValueOnce({ _sum: { totalAmount: 120000 } }); // monthlyRevenue

      mockPrisma.room.count.mockResolvedValue(20);

      mockPrisma.booking.findMany.mockResolvedValue([
        { id: 'b-1', bookingNumber: 'BK-001', roomType: { name: 'Deluxe' } },
      ]);

      const result = await service.getDashboardStats('hotel-1');

      expect(result.totalBookings).toBe(50);
      expect(result.monthlyBookings).toBe(12);
      expect(result.todayCheckIns).toBe(3);
      expect(result.totalRevenue).toBe(500000);
      expect(result.monthlyRevenue).toBe(120000);
      expect(result.occupancyRate).toBe(25); // 5/20 * 100
      expect(result.recentBookings).toHaveLength(1);
    });

    it('should return 0 occupancy when no rooms', async () => {
      mockPrisma.booking.count.mockResolvedValue(0);
      mockPrisma.booking.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
      mockPrisma.room.count.mockResolvedValue(0);
      mockPrisma.booking.findMany.mockResolvedValue([]);

      const result = await service.getDashboardStats('hotel-1');

      expect(result.occupancyRate).toBe(0);
      expect(result.totalRevenue).toBe(0);
    });
  });
});
