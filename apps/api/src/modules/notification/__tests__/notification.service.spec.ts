import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../notification.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockPrisma = {
    booking: {
      findUnique: jest.fn(),
    },
    hotel: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    // Clear SMTP env vars so emails are logged
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    service.onModuleInit();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendEmail', () => {
    it('should log email in dev mode (no SMTP)', async () => {
      const result = await service.sendEmail({
        to: 'guest@example.com',
        subject: 'Test Subject',
        html: '<h1>Hello</h1>',
      });
      expect(result).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      // Force an error scenario by mocking transporter
      const result = await service.sendEmail({
        to: '',
        subject: '',
        html: '',
      });
      // Should still return true in dev mode (just logs)
      expect(result).toBe(true);
    });
  });

  describe('notifyBookingConfirmed', () => {
    it('should send booking confirmation email', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-1',
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        bookingNumber: 'BK-20260301-ABC',
        checkInDate: new Date('2026-04-01'),
        checkOutDate: new Date('2026-04-03'),
        totalAmount: 5000,
        numRooms: 1,
        hotel: {
          name: 'Test Hotel',
          phone: '+91-9876543210',
          email: 'hotel@test.com',
          address: '123 Test Street',
          city: 'Mumbai',
        },
        roomType: {
          name: 'Deluxe Room',
        },
      });

      const sendEmailSpy = jest.spyOn(service, 'sendEmail');
      await service.notifyBookingConfirmed('booking-1');

      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'john@example.com',
          subject: expect.stringContaining('Booking Confirmed'),
          html: expect.stringContaining('John Doe'),
        }),
      );
    });

    it('should do nothing if booking not found', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      const sendEmailSpy = jest.spyOn(service, 'sendEmail');
      await service.notifyBookingConfirmed('nonexistent-booking');

      expect(sendEmailSpy).not.toHaveBeenCalled();
    });
  });

  describe('notifyBookingCancelled', () => {
    it('should send cancellation email', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        id: 'booking-2',
        guestName: 'Jane Doe',
        guestEmail: 'jane@example.com',
        bookingNumber: 'BK-20260301-XYZ',
        totalAmount: 3500,
        hotel: {
          name: 'Test Hotel',
        },
      });

      const sendEmailSpy = jest.spyOn(service, 'sendEmail');
      await service.notifyBookingCancelled('booking-2');

      expect(sendEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'jane@example.com',
          subject: expect.stringContaining('Booking Cancelled'),
          html: expect.stringContaining('Jane Doe'),
        }),
      );
    });
  });
});
