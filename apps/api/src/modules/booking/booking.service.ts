import { 
  Injectable, 
  BadRequestException, 
  NotFoundException, 
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationService } from '../notification/notification.service';
import { QueueService } from '../queue/queue.service';
import { PaymentService } from '../payment/payment.service';
import { 
  CreateDailyBookingInput, 
  CreateHourlyBookingInput,
  BookingFiltersInput,
  BookingPaginationInput,
  CancelBookingInput,
  UpdateBookingStatusInput,
  ModifyBookingInput,
} from './dto/create-booking.input';
import { BookingType, BookingSource, BookingStatus, PaymentStatus } from './entities/booking.entity';
import { Prisma } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { addDays, differenceInDays, format, addHours, parseISO, startOfDay, isBefore } from 'date-fns';
import { randomBytes } from 'crypto';

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationService,
    private readonly queue: QueueService,
    private readonly paymentService: PaymentService,
  ) {}

  // Lock TTL: 30 seconds to complete booking transaction
  private readonly LOCK_TTL = 30000;
  private readonly TAX_RATE = 0.18; // 18% GST

  /**
   * Generate unique booking number
   */
  private generateBookingNumber(): string {
    const date = format(new Date(), 'yyyyMMdd');
    const random = randomBytes(3).toString('hex').toUpperCase();
    return `BK-${date}-${random}`;
  }

  /**
   * Ensure booking references a valid guest user record.
   */
  private async resolveBookingGuestId(
    guestId: string | undefined,
    guestInfo: { name: string; email: string; phone: string },
  ): Promise<string> {
    if (guestId) {
      const existingGuest = await this.prisma.user.findUnique({
        where: { id: guestId },
        select: { id: true },
      });

      if (existingGuest) {
        return existingGuest.id;
      }
    }

    const email = guestInfo.email.trim().toLowerCase();
    const phone = guestInfo.phone.trim() || null;
    const name = guestInfo.name.trim() || 'Guest';

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, phone: true },
    });

    if (existingByEmail) {
      const shouldUpdateName = !existingByEmail.name && !!name;
      const shouldUpdatePhone = !existingByEmail.phone && !!phone;

      if (shouldUpdateName || shouldUpdatePhone) {
        await this.prisma.user.update({
          where: { id: existingByEmail.id },
          data: {
            ...(shouldUpdateName ? { name } : {}),
            ...(shouldUpdatePhone ? { phone } : {}),
          },
        });
      }

      return existingByEmail.id;
    }

    try {
      const createdGuest = await this.prisma.user.create({
        data: {
          name,
          email,
          phone,
        },
        select: { id: true },
      });

      return createdGuest.id;
    } catch (error) {
      // Handle a race where another request created the same email concurrently.
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const guest = await this.prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });

        if (guest) {
          return guest.id;
        }
      }

      throw error;
    }
  }

  /**
   * Create a daily booking with double-booking prevention
   */
  async createDailyBooking(input: CreateDailyBookingInput, guestId?: string) {
    const { 
      hotelId, 
      roomTypeId, 
      checkInDate, 
      checkOutDate, 
      numRooms = 1,
      numGuests = 2,
      numExtraGuests = 0,
      guestInfo,
      specialRequests,
      source = BookingSource.DIRECT,
    } = input;

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    
    // Ensure accurate day difference calculation
    const nights = differenceInDays(startOfDay(checkOut), startOfDay(checkIn));

    if (nights < 1) {
      throw new BadRequestException('Check-out date must be after check-in date');
    }

    // Allow same-day bookings by checking against start of today
    if (isBefore(startOfDay(checkIn), startOfDay(new Date()))) {
      throw new BadRequestException('Check-in date cannot be in the past');
    }

    // Get room type and hotel
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: { 
        hotel: true,
      },
    });

    if (!roomType || roomType.hotelId !== hotelId) {
      throw new NotFoundException('Room type not found');
    }

    if (!roomType.isActive) {
      throw new BadRequestException('Room type is not available');
    }

    // Validate guest count
    const totalGuests = numGuests + numExtraGuests;
    const maxCapacity = roomType.maxGuests + roomType.maxExtraGuests;
    
    if (totalGuests > maxCapacity * numRooms) {
      throw new BadRequestException(
        `Maximum ${maxCapacity * numRooms} guests allowed for ${numRooms} room(s)`
      );
    }

    // Generate lock keys for all dates in the range
    const lockKeys = [];
    for (let i = 0; i < nights; i++) {
      const date = format(addDays(checkIn, i), 'yyyy-MM-dd');
      lockKeys.push(`lock:inventory:${roomTypeId}:${date}`);
    }

    // Acquire locks for all dates
    const locks: { key: string; acquired: boolean }[] = [];
    
    try {
      for (const key of lockKeys) {
        const acquired = await this.redis.acquireLock(key, this.LOCK_TTL);
        locks.push({ key, acquired });
        
        if (!acquired) {
          // Release any acquired locks
          await this.releaseLocks(locks.filter(l => l.acquired).map(l => l.key));
          throw new ConflictException(
            'Unable to process booking. Please try again in a moment.'
          );
        }
      }

      // Check availability within lock
      const availability = await this.checkDailyAvailabilityInternal(
        roomTypeId, 
        checkIn, 
        checkOut, 
        numRooms
      );

      if (!availability.isAvailable) {
        await this.releaseLocks(locks.map(l => l.key));
        throw new BadRequestException('Rooms are no longer available for the selected dates');
      }

      // Calculate pricing
      const roomTotal = availability.totalPrice;
      const extraGuestTotal = numExtraGuests * roomType.extraGuestCharge * nights;
      const subtotal = roomTotal + extraGuestTotal;
      const taxes = subtotal * this.TAX_RATE;
      const totalAmount = subtotal + taxes;

      const resolvedGuestId = await this.resolveBookingGuestId(guestId, guestInfo);

      // Create booking and update inventory in a transaction
      const booking = await this.prisma.$transaction(async (tx: any) => {
        // Create the booking
        const newBooking = await tx.booking.create({
          data: {
            bookingNumber: this.generateBookingNumber(),
            hotelId,
            guestId: resolvedGuestId,
            roomTypeId,
            bookingType: BookingType.DAILY,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            numRooms,
            numGuests,
            numExtraGuests,
            roomTotal,
            extraGuestTotal,
            taxes,
            discountAmount: 0,
            totalAmount,
            source,
            status: BookingStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            guestName: guestInfo.name,
            guestEmail: guestInfo.email,
            guestPhone: guestInfo.phone,
            specialRequests,
          },
          include: {
            hotel: {
              select: { id: true, name: true, slug: true, address: true, city: true, phone: true },
            },
            roomType: {
              select: { id: true, name: true, slug: true, images: true },
            },
          },
        });

        // Update inventory for each date
        for (let i = 0; i < nights; i++) {
          const date = addDays(checkIn, i);
          
          // Try to update existing inventory
          const updated = await tx.roomInventory.updateMany({
            where: {
              roomTypeId,
              date,
              availableCount: { gte: numRooms },
            },
            data: {
              availableCount: { decrement: numRooms },
            },
          });

          // If no inventory record exists, create one
          if (updated.count === 0) {
            // Check if it exists but with insufficient inventory
            const existing = await tx.roomInventory.findUnique({
              where: {
                roomTypeId_date: { roomTypeId, date },
              },
            });

            if (existing) {
              // Insufficient inventory
              throw new BadRequestException('Rooms are no longer available');
            }

            // Create new inventory record
            await tx.roomInventory.create({
              data: {
                roomTypeId,
                date,
                availableCount: roomType.totalRooms - numRooms,
              },
            });
          }
        }

        return newBooking;
      });

      // Release locks after successful booking
      await this.releaseLocks(locks.map(l => l.key));

      this.logger.log(`Created booking ${booking.bookingNumber} for hotel ${hotelId}`);

      // Schedule auto-cancel for unpaid bookings (30 min timeout)
      this.queue.scheduleAutoCancel(booking.id, 30).catch(() => {});

      return {
        success: true,
        booking,
        message: 'Booking created successfully. Please complete payment.',
      };

    } catch (error) {
      // Release locks on error
      await this.releaseLocks(locks.filter(l => l.acquired).map(l => l.key));
      throw error;
    }
  }

  /**
   * Create an hourly booking with double-booking prevention
   */
  async createHourlyBooking(input: CreateHourlyBookingInput, guestId?: string) {
    const { 
      hotelId, 
      roomTypeId, 
      date,
      checkInTime,
      numHours,
      numRooms = 1,
      numGuests = 2,
      guestInfo,
      specialRequests,
      source = BookingSource.DIRECT,
    } = input;

    const bookingDate = new Date(date);
    
    // Allow same-day bookings
    if (isBefore(startOfDay(bookingDate), startOfDay(new Date()))) {
      throw new BadRequestException('Booking date cannot be in the past');
    }

    // Get room type and hotel
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: { hotel: true },
    });

    if (!roomType || roomType.hotelId !== hotelId) {
      throw new NotFoundException('Room type not found');
    }

    if (!roomType.basePriceHourly) {
      throw new BadRequestException('This room type does not support hourly booking');
    }

    // Validate hours
    const minHours = roomType.minHours ?? roomType.hotel.hourlyMinHours;
    const maxHours = roomType.maxHours ?? roomType.hotel.hourlyMaxHours;

    if (numHours < minHours || numHours > maxHours) {
      throw new BadRequestException(
        `Booking must be between ${minHours} and ${maxHours} hours`
      );
    }

    // Calculate check-out time
    const [hours, minutes] = checkInTime.split(':').map(Number);
    const checkOutHour = hours + numHours;
    const checkOutTime = `${checkOutHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Validate time slot
    if (checkOutHour > 24) {
      throw new BadRequestException('Booking cannot extend past midnight');
    }

    // Generate lock key for the slot
    const dateStr = format(bookingDate, 'yyyy-MM-dd');
    const lockKey = `lock:hourly:${roomTypeId}:${dateStr}:${checkInTime}:${checkOutTime}`;

    // Acquire lock
    const acquired = await this.redis.acquireLock(lockKey, this.LOCK_TTL);
    
    if (!acquired) {
      throw new ConflictException(
        'Unable to process booking. Please try again in a moment.'
      );
    }

    try {
      // Check availability
      const availability = await this.checkHourlyAvailabilityInternal(
        roomTypeId,
        bookingDate,
        checkInTime,
        checkOutTime,
        numRooms
      );

      if (!availability.isAvailable) {
        throw new BadRequestException('Time slot is no longer available');
      }

      // Calculate pricing
      const roomTotal = roomType.basePriceHourly * numHours * numRooms;
      const taxes = roomTotal * this.TAX_RATE;
      const totalAmount = roomTotal + taxes;

      const resolvedGuestId = await this.resolveBookingGuestId(guestId, guestInfo);

      // Create booking and update slots
      const booking = await this.prisma.$transaction(async (tx: any) => {
        // Create the booking
        const newBooking = await tx.booking.create({
          data: {
            bookingNumber: this.generateBookingNumber(),
            hotelId,
            guestId: resolvedGuestId,
            roomTypeId,
            bookingType: BookingType.HOURLY,
            checkInDate: bookingDate,
            checkInTime,
            checkOutTime,
            numHours,
            numRooms,
            numGuests,
            numExtraGuests: 0,
            roomTotal,
            extraGuestTotal: 0,
            taxes,
            discountAmount: 0,
            totalAmount,
            source,
            status: BookingStatus.PENDING,
            paymentStatus: PaymentStatus.PENDING,
            guestName: guestInfo.name,
            guestEmail: guestInfo.email,
            guestPhone: guestInfo.phone,
            specialRequests,
          },
          include: {
            hotel: {
              select: { id: true, name: true, slug: true, address: true, city: true, phone: true },
            },
            roomType: {
              select: { id: true, name: true, slug: true, images: true },
            },
          },
        });

        // Update or create hourly slot
        const existingSlot = await tx.hourlySlot.findUnique({
          where: {
            roomTypeId_date_slotStart_slotEnd: {
              roomTypeId,
              date: bookingDate,
              slotStart: checkInTime,
              slotEnd: checkOutTime,
            },
          },
        });

        if (existingSlot) {
          await tx.hourlySlot.update({
            where: { id: existingSlot.id },
            data: {
              availableCount: { decrement: numRooms },
            },
          });
        } else {
          await tx.hourlySlot.create({
            data: {
              roomTypeId,
              date: bookingDate,
              slotStart: checkInTime,
              slotEnd: checkOutTime,
              availableCount: roomType.totalRooms - numRooms,
            },
          });
        }

        return newBooking;
      });

      // Release lock
      await this.redis.releaseLock(lockKey);

      this.logger.log(`Created hourly booking ${booking.bookingNumber} for hotel ${hotelId}`);

      // Schedule auto-cancel for unpaid bookings (30 min timeout)
      this.queue.scheduleAutoCancel(booking.id, 30).catch(() => {});

      return {
        success: true,
        booking,
        message: 'Booking created successfully. Please complete payment.',
      };

    } catch (error) {
      await this.redis.releaseLock(lockKey);
      throw error;
    }
  }

  /**
   * Get booking by ID
   */
  async getBookingById(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        hotel: {
          select: { id: true, name: true, slug: true, address: true, city: true, phone: true },
        },
        roomType: {
          select: { id: true, name: true, slug: true, images: true },
        },
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${id} not found`);
    }

    return booking;
  }

  /**
   * Get booking by booking number
   */
  async getBookingByNumber(bookingNumber: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        hotel: {
          select: { id: true, name: true, slug: true, address: true, city: true, phone: true },
        },
        roomType: {
          select: { id: true, name: true, slug: true, images: true },
        },
        payments: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking ${bookingNumber} not found`);
    }

    return booking;
  }

  /**
   * List bookings with filters
   */
  async listBookings(
    filters?: BookingFiltersInput,
    pagination?: BookingPaginationInput,
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.hotelId) {
      where.hotelId = filters.hotelId;
    }

    if (filters?.guestId) {
      where.guestId = filters.guestId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.bookingType) {
      where.bookingType = filters.bookingType;
    }

    if (filters?.search) {
      where.OR = [
        { bookingNumber: { contains: filters.search, mode: 'insensitive' } },
        { guestName: { contains: filters.search, mode: 'insensitive' } },
        { guestEmail: { contains: filters.search, mode: 'insensitive' } },
        { guestPhone: { contains: filters.search } },
      ];
    }

    if (filters?.fromDate) {
      where.checkInDate = { gte: filters.fromDate };
    }

    if (filters?.toDate) {
      where.checkInDate = { 
        ...(where.checkInDate as object || {}), 
        lte: filters.toDate 
      };
    }

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          hotel: {
            select: { id: true, name: true, slug: true },
          },
          roomType: {
            select: { id: true, name: true, slug: true, images: true },
          },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      total,
      page,
      limit,
      hasMore: skip + bookings.length < total,
    };
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(input: CancelBookingInput) {
    const { bookingId, reason } = input;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { roomType: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.CHECKED_OUT) {
      throw new BadRequestException('Cannot cancel a completed booking');
    }

    // Update booking and restore inventory
    const updatedBooking = await this.prisma.$transaction(async (tx: any) => {
      const cancelled = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: BookingStatus.CANCELLED,
          cancellationReason: reason,
          cancelledAt: new Date(),
        },
      });

      // Restore inventory based on booking type
      if (booking.bookingType === BookingType.DAILY) {
        const nights = differenceInDays(
          booking.checkOutDate!, 
          booking.checkInDate
        );

        for (let i = 0; i < nights; i++) {
          const date = addDays(booking.checkInDate, i);
          
          await tx.roomInventory.updateMany({
            where: {
              roomTypeId: booking.roomTypeId,
              date,
            },
            data: {
              availableCount: { increment: booking.numRooms },
            },
          });
        }
      } else {
        // Hourly booking
        await tx.hourlySlot.updateMany({
          where: {
            roomTypeId: booking.roomTypeId,
            date: booking.checkInDate,
            slotStart: booking.checkInTime!,
            slotEnd: booking.checkOutTime!,
          },
          data: {
            availableCount: { increment: booking.numRooms },
          },
        });
      }

      return cancelled;
    });

    this.logger.log(`Cancelled booking ${booking.bookingNumber}`);

    // Auto-refund if payment was captured
    if (booking.paymentStatus === PaymentStatus.PAID) {
      try {
        await this.paymentService.processRefund(bookingId);
        this.logger.log(`Auto-refund processed for cancelled booking ${booking.bookingNumber}`);
      } catch (refundError) {
        this.logger.warn(`Auto-refund failed for booking ${booking.bookingNumber}: ${refundError.message}`);
        // Don't fail the cancellation if refund fails — admin can process manually
      }
    }

    // Send cancellation notification (fire and forget)
    this.notifications.notifyBookingCancelled(bookingId).catch(() => {});

    return updatedBooking;
  }

  /**
   * Update booking status (for hotel staff)
   */
  async updateBookingStatus(input: UpdateBookingStatusInput) {
    const { bookingId, status, assignedRoomId } = input;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Validate status transitions
    const validTransitions: Record<BookingStatus, BookingStatus[]> = {
      [BookingStatus.PENDING]: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
      [BookingStatus.CONFIRMED]: [BookingStatus.CHECKED_IN, BookingStatus.CANCELLED, BookingStatus.NO_SHOW],
      [BookingStatus.CHECKED_IN]: [BookingStatus.CHECKED_OUT],
      [BookingStatus.CHECKED_OUT]: [],
      [BookingStatus.CANCELLED]: [],
      [BookingStatus.NO_SHOW]: [],
    };

    if (!validTransitions[booking.status as BookingStatus].includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${booking.status} to ${status}`
      );
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        status,
        ...(assignedRoomId && { assignedRoomId }),
      },
      include: {
        hotel: true,
        roomType: true,
      },
    });

    this.logger.log(
      `Updated booking ${booking.bookingNumber} status to ${status}`
    );

    // Send notifications based on status change (fire and forget)
    if (status === BookingStatus.CONFIRMED) {
      this.notifications.notifyBookingConfirmed(bookingId).catch(() => {});
      // Schedule check-in reminder for 1 day before
      if (updatedBooking.checkInDate) {
        this.queue.scheduleBookingReminder(bookingId, new Date(updatedBooking.checkInDate)).catch(() => {});
      }
    } else if (status === BookingStatus.CHECKED_OUT) {
      this.notifications.notifyCheckoutReviewPrompt(bookingId).catch(() => {});
      // Schedule review request email for 24h post-checkout
      if (updatedBooking.checkOutDate) {
        this.queue.scheduleReviewRequest(bookingId, new Date(updatedBooking.checkOutDate)).catch(() => {});
      }
    }

    return updatedBooking;
  }

  // ============================================
  // Private helper methods
  // ============================================

  private async releaseLocks(keys: string[]) {
    for (const key of keys) {
      await this.redis.releaseLock(key);
    }
  }

  private async checkDailyAvailabilityInternal(
    roomTypeId: string,
    checkIn: Date,
    checkOut: Date,
    numRooms: number,
  ) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
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

    if (!roomType) {
      return { isAvailable: false, totalPrice: 0 };
    }

    const nights = differenceInDays(checkOut, checkIn);
    let totalPrice = 0;
    let isAvailable = true;

    for (let i = 0; i < nights; i++) {
      const date = addDays(checkIn, i);
      const dateStr = format(date, 'yyyy-MM-dd');

      const inv = roomType.inventory.find(
        (inv: any) => format(new Date(inv.date), 'yyyy-MM-dd') === dateStr
      );

      const available = inv?.availableCount ?? roomType.totalRooms;
      const price = inv?.priceOverride ?? roomType.basePriceDaily;
      const isClosed = inv?.isClosed ?? false;

      if (available < numRooms || isClosed) {
        isAvailable = false;
        break;
      }

      totalPrice += price * numRooms;
    }

    return { isAvailable, totalPrice };
  }

  private async checkHourlyAvailabilityInternal(
    roomTypeId: string,
    date: Date,
    checkInTime: string,
    checkOutTime: string,
    numRooms: number,
  ) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: {
        hourlySlots: {
          where: {
            date,
            slotStart: checkInTime,
            slotEnd: checkOutTime,
          },
        },
      },
    });

    if (!roomType) {
      return { isAvailable: false };
    }

    const slot = roomType.hourlySlots[0];
    const available = slot?.availableCount ?? roomType.totalRooms;
    const isClosed = slot?.isClosed ?? false;

    return {
      isAvailable: available >= numRooms && !isClosed,
    };
  }

  /**
   * Modify booking dates/details (for guest or admin)
   * Only allowed for PENDING or CONFIRMED bookings.
   * Recalculates pricing based on new dates.
   */
  async modifyBooking(input: ModifyBookingInput) {
    const { bookingId, checkInDate, checkOutDate, numRooms, numGuests, specialRequests } = input;

    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { roomType: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) {
      throw new BadRequestException('Can only modify pending or confirmed bookings');
    }

    const updates: any = {};

    // Update dates if provided
    const newCheckIn = checkInDate || booking.checkInDate;
    const newCheckOut = checkOutDate || booking.checkOutDate;
    const newNumRooms = numRooms || booking.numRooms;
    const newNumGuests = numGuests || booking.numGuests;

    if (checkInDate) updates.checkInDate = checkInDate;
    if (checkOutDate) updates.checkOutDate = checkOutDate;
    if (numRooms) updates.numRooms = numRooms;
    if (numGuests) updates.numGuests = numGuests;
    if (specialRequests !== undefined) updates.specialRequests = specialRequests;

    // Recalculate pricing if dates or rooms changed
    if (checkInDate || checkOutDate || numRooms) {
      if (booking.bookingType === BookingType.DAILY && newCheckOut) {
        const nights = differenceInDays(newCheckOut, newCheckIn);
        if (nights <= 0) {
          throw new BadRequestException('Check-out must be after check-in');
        }
        const roomTotal = booking.roomType.basePriceDaily * nights * newNumRooms;
        const extraGuestTotal = booking.numExtraGuests * (booking.roomType.extraGuestCharge || 0) * nights;
        const subtotal = roomTotal + extraGuestTotal;
        const taxes = Math.round(subtotal * this.TAX_RATE * 100) / 100;
        const totalAmount = subtotal + taxes;

        Object.assign(updates, {
          roomTotal,
          extraGuestTotal,
          taxes,
          totalAmount,
          hotelPayout: totalAmount * (1 - 0.1), // Recalc payout
          commissionAmount: totalAmount * 0.1,
        });
      }
    }

    const updatedBooking = await this.prisma.booking.update({
      where: { id: bookingId },
      data: updates,
      include: {
        hotel: { select: { id: true, name: true, slug: true, address: true, city: true, phone: true } },
        roomType: { select: { id: true, name: true, slug: true, images: true } },
        payments: true,
      },
    });

    this.logger.log(`Modified booking ${booking.bookingNumber}`);

    return updatedBooking;
  }
}
