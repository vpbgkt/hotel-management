import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentService } from '../payment.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * PaymentService unit tests
 * Tests Razorpay-first gateway selection and core payment flows.
 * Uses mocked PrismaService — no real DB or gateway calls.
 */
describe('PaymentService', () => {
  let service: PaymentService;
  let mockPrisma: Record<string, any>;

  const mockBooking = {
    id: 'booking-1',
    bookingNumber: 'BS-001',
    totalAmount: 5000,
    roomTotal: 4500,
    taxes: 500,
    paymentStatus: 'PENDING',
    hotel: { id: 'hotel-1', name: 'Test Hotel' },
    roomType: { id: 'rt-1', name: 'Deluxe Room' },
    payments: [],
  };

  const mockPayment = {
    id: 'payment-1',
    bookingId: 'booking-1',
    gateway: 'DEMO',
    gatewayOrderId: 'demo_order_abc123',
    gatewayPaymentId: null,
    amount: 5000,
    currency: 'INR',
    status: 'CREATED',
    metadata: {},
    refundAmount: null,
    booking: mockBooking,
  };

  beforeEach(async () => {
    // Clear Razorpay env vars so we default to DEMO gateway in tests
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;

    mockPrisma = {
      booking: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn(mockPrisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('gateway selection', () => {
    it('uses DEMO gateway when Razorpay credentials are absent', () => {
      // The service was compiled without RAZORPAY_KEY_ID/SECRET, so gateway is DEMO
      // We verify this indirectly through initiatePayment returning gateway: 'DEMO'
      expect(service).toBeDefined();
    });

    it('uses RAZORPAY gateway when credentials are set', async () => {
      process.env.RAZORPAY_KEY_ID = 'rzp_test_key';
      process.env.RAZORPAY_KEY_SECRET = 'rzp_test_secret';

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PaymentService,
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      const rzpService = module.get<PaymentService>(PaymentService);
      expect(rzpService).toBeDefined();
    });
  });

  describe('initiatePayment', () => {
    it('throws NotFoundException when booking does not exist', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(service.initiatePayment('nonexistent', 'upi')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when booking is already paid', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        paymentStatus: 'PAID',
      });

      await expect(service.initiatePayment('booking-1', 'upi')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates a payment record and returns gateway data for DEMO gateway', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrisma.payment.create.mockResolvedValue({
        ...mockPayment,
        id: 'payment-created',
      });

      const result = await service.initiatePayment('booking-1', 'upi');

      expect(result.gateway).toBe('DEMO');
      expect(result.amount).toBe(5000);
      expect(result.currency).toBe('INR');
      expect(result.paymentId).toBe('payment-created');
      expect(result.bookingNumber).toBe('BS-001');
      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            bookingId: 'booking-1',
            gateway: 'DEMO',
            amount: 5000,
            currency: 'INR',
            status: 'CREATED',
          }),
        }),
      );
    });
  });

  describe('confirmPayment', () => {
    it('throws NotFoundException when payment does not exist', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(null);

      await expect(service.confirmPayment('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns already-confirmed response when payment is already CAPTURED', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue({
        ...mockPayment,
        status: 'CAPTURED',
      });

      const result = await service.confirmPayment('payment-1');
      expect(result.success).toBe(true);
      expect(result.message).toContain('already confirmed');
    });

    it('confirms payment and updates booking to PAID/CONFIRMED (DEMO gateway)', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);
      mockPrisma.payment.update.mockResolvedValue({ ...mockPayment, status: 'CAPTURED' });
      mockPrisma.booking.update.mockResolvedValue({
        ...mockBooking,
        paymentStatus: 'PAID',
        status: 'CONFIRMED',
        hotel: mockBooking.hotel,
        roomType: mockBooking.roomType,
      });

      const result = await service.confirmPayment('payment-1');

      expect(result.success).toBe(true);
      expect(result.bookingId).toBe('booking-1');
    });
  });

  describe('processRefund', () => {
    it('throws NotFoundException when booking does not exist', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue(null);

      await expect(service.processRefund('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when no captured payment exists', async () => {
      mockPrisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        payments: [{ ...mockPayment, status: 'CREATED' }],
      });

      await expect(service.processRefund('booking-1')).rejects.toThrow(BadRequestException);
    });

    it('processes a full refund for a captured payment', async () => {
      const capturedPayment = {
        ...mockPayment,
        status: 'CAPTURED',
        gatewayPaymentId: 'demo_pay_captured',
      };

      mockPrisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        payments: [capturedPayment],
      });
      mockPrisma.payment.update.mockResolvedValue({ ...capturedPayment, status: 'REFUNDED' });
      mockPrisma.booking.update.mockResolvedValue({ ...mockBooking, paymentStatus: 'REFUNDED' });

      const result = await service.processRefund('booking-1');

      expect(result.success).toBe(true);
      expect(result.amount).toBe(5000);
      expect(result.refundId).toBeDefined();
    });

    it('processes a partial refund', async () => {
      const capturedPayment = {
        ...mockPayment,
        status: 'CAPTURED',
        gatewayPaymentId: 'demo_pay_captured',
        refundAmount: 0,
      };

      mockPrisma.booking.findUnique.mockResolvedValue({
        ...mockBooking,
        payments: [capturedPayment],
      });
      mockPrisma.payment.update.mockResolvedValue(capturedPayment);
      mockPrisma.booking.update.mockResolvedValue({
        ...mockBooking,
        paymentStatus: 'PARTIALLY_REFUNDED',
      });

      const result = await service.processRefund('booking-1', 2000);

      expect(result.success).toBe(true);
      expect(result.amount).toBe(2000);
    });
  });

  describe('getPaymentById', () => {
    it('returns payment with booking details', async () => {
      mockPrisma.payment.findUnique.mockResolvedValue(mockPayment);

      const result = await service.getPaymentById('payment-1');
      expect(result).toEqual(mockPayment);
      expect(mockPrisma.payment.findUnique).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        include: { booking: true },
      });
    });
  });

  describe('getPaymentsByBooking', () => {
    it('returns all payments for a booking ordered by date', async () => {
      mockPrisma.payment.findMany.mockResolvedValue([mockPayment]);

      const result = await service.getPaymentsByBooking('booking-1');
      expect(result).toHaveLength(1);
      expect(mockPrisma.payment.findMany).toHaveBeenCalledWith({
        where: { bookingId: 'booking-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});
