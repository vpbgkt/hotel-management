import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { BookingService } from '../booking.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { NotificationService } from '../../notification/notification.service';
import { QueueService } from '../../queue/queue.service';
import { PaymentService } from '../../payment/payment.service';
import { CreateDailyBookingInput } from '../dto/create-booking.input';
import { addDays } from 'date-fns';

describe('BookingService', () => {
  let service: BookingService;
  let mockPrisma: Record<string, any>;
  let mockRedis: Record<string, any>;
  let mockNotification: Record<string, any>;
  let mockQueue: Record<string, any>;
  let mockPayment: Record<string, any>;

  beforeEach(async () => {
    mockPrisma = {
      roomType: { findUnique: jest.fn() },
      booking: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      roomInventory: { findMany: jest.fn(), upsert: jest.fn() },
      payment: { create: jest.fn() },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn(mockPrisma)),
    };

    mockRedis = {
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
      del: jest.fn(),
      delPattern: jest.fn(),
    };

    mockNotification = {
      notifyBookingConfirmed: jest.fn(),
      notifyBookingCancelled: jest.fn(),
    };

    mockQueue = {
      scheduleAutoCancel: jest.fn().mockResolvedValue(undefined),
      scheduleBookingReminder: jest.fn().mockResolvedValue(undefined),
      scheduleReviewRequest: jest.fn().mockResolvedValue(undefined),
      sendEmail: jest.fn().mockResolvedValue(undefined),
    };

    mockPayment = {
      processRefund: jest.fn().mockResolvedValue({ success: true, refundId: 'rfnd_test', amount: 1000 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
        { provide: NotificationService, useValue: mockNotification },
        { provide: QueueService, useValue: mockQueue },
        { provide: PaymentService, useValue: mockPayment },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDailyBooking', () => {
    const makeInput = (overrides: Partial<CreateDailyBookingInput> = {}): CreateDailyBookingInput => ({
      hotelId: 'hotel-1',
      roomTypeId: 'room-type-1',
      checkInDate: addDays(new Date(), 7),
      checkOutDate: addDays(new Date(), 9),
      numRooms: 1,
      numGuests: 2,
      numExtraGuests: 0,
      guestInfo: {
        name: 'Test Guest',
        email: 'guest@test.com',
        phone: '9876543210',
      },
      ...overrides,
    } as CreateDailyBookingInput);

    const mockRoomType = (overrides: Record<string, any> = {}) => ({
      id: 'room-type-1',
      hotelId: 'hotel-1',
      isActive: true,
      maxGuests: 2,
      maxExtraGuests: 1,
      totalRooms: 5,
      basePriceDaily: 3000,
      extraGuestCharge: 500,
      hotel: { id: 'hotel-1', commissionRate: 0.10, commissionType: 'PERCENTAGE' },
      ...overrides,
    });

    it('should reject if checkout is before checkin', async () => {
      const input = makeInput({
        checkInDate: addDays(new Date(), 9),
        checkOutDate: addDays(new Date(), 7),
      });

      await expect(service.createDailyBooking(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject if checkin is in the past', async () => {
      const input = makeInput({
        checkInDate: new Date('2020-01-01'),
        checkOutDate: new Date('2020-01-03'),
      });

      await expect(service.createDailyBooking(input)).rejects.toThrow(BadRequestException);
    });

    it('should reject if room type not found', async () => {
      mockPrisma.roomType.findUnique.mockResolvedValue(null);
      await expect(service.createDailyBooking(makeInput())).rejects.toThrow(NotFoundException);
    });

    it('should reject if room type is inactive', async () => {
      mockPrisma.roomType.findUnique.mockResolvedValue(mockRoomType({ isActive: false }));
      await expect(service.createDailyBooking(makeInput())).rejects.toThrow(BadRequestException);
    });

    it('should reject if guest count exceeds capacity', async () => {
      mockPrisma.roomType.findUnique.mockResolvedValue(mockRoomType({ maxExtraGuests: 0 }));
      const input = makeInput({ numGuests: 5 });
      await expect(service.createDailyBooking(input)).rejects.toThrow(BadRequestException);
    });

    it('should throw conflict if locks cannot be acquired', async () => {
      mockPrisma.roomType.findUnique.mockResolvedValue(mockRoomType());
      mockRedis.acquireLock.mockResolvedValue(false);
      await expect(service.createDailyBooking(makeInput())).rejects.toThrow(ConflictException);
    });
  });
});
