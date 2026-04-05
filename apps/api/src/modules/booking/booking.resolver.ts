import { Resolver, Query, Mutation, Args, ID, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { BookingService } from './booking.service';
import { Booking, BookingResult, PaginatedBookings } from './entities/booking.entity';
import { 
  CreateDailyBookingInput, 
  CreateHourlyBookingInput,
  BookingFiltersInput,
  BookingPaginationInput,
  CancelBookingInput,
  UpdateBookingStatusInput,
  ModifyBookingInput,
} from './dto/create-booking.input';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GqlCurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';

@Resolver(() => Booking)
export class BookingResolver {
  constructor(private readonly bookingService: BookingService) {}

  /**
   * Create a daily booking
   */
  @Mutation(() => BookingResult, { 
    name: 'createDailyBooking', 
    description: 'Create a daily booking' 
  })
  @UseGuards(GqlAuthGuard)
  async createDailyBooking(
    @Args('input') input: CreateDailyBookingInput,
    @GqlCurrentUser() user: any,
  ) {
    return this.bookingService.createDailyBooking(input, user?.sub);
  }

  /**
   * Create an hourly booking
   */
  @Mutation(() => BookingResult, { 
    name: 'createHourlyBooking', 
    description: 'Create an hourly booking' 
  })
  @UseGuards(GqlAuthGuard)
  async createHourlyBooking(
    @Args('input') input: CreateHourlyBookingInput,
    @GqlCurrentUser() user: any,
  ) {
    return this.bookingService.createHourlyBooking(input, user?.sub);
  }

  /**
   * Get booking by ID
   */
  @Query(() => Booking, { name: 'booking', description: 'Get booking by ID' })
  @UseGuards(GqlAuthGuard)
  async getBookingById(
    @Args('id', { type: () => ID }) id: string,
    @GqlCurrentUser() user: any,
  ) {
    return this.bookingService.getBookingById(id);
  }

  /**
   * Get booking by booking number
   */
  @Query(() => Booking, { 
    name: 'bookingByNumber', 
    description: 'Get booking by booking number' 
  })
  async getBookingByNumber(
    @Args('bookingNumber') bookingNumber: string,
  ) {
    return this.bookingService.getBookingByNumber(bookingNumber);
  }

  /**
   * List bookings with filters (for hotel dashboard)
   */
  @Query(() => PaginatedBookings, { 
    name: 'bookings', 
    description: 'List bookings with filters' 
  })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('HOTEL_ADMIN', 'HOTEL_STAFF')
  async listBookings(
    @Args('filters', { nullable: true }) filters?: BookingFiltersInput,
    @Args('pagination', { nullable: true }) pagination?: BookingPaginationInput,
  ) {
    return this.bookingService.listBookings(filters, pagination);
  }

  /**
   * Cancel a booking
   */
  @Mutation(() => Booking, { 
    name: 'cancelBooking', 
    description: 'Cancel a booking' 
  })
  @UseGuards(GqlAuthGuard)
  async cancelBooking(
    @Args('input') input: CancelBookingInput,
    @GqlCurrentUser() user: any,
  ) {
    return this.bookingService.cancelBooking(input);
  }

  /**
   * Update booking status (for hotel staff)
   */
  @Mutation(() => Booking, { 
    name: 'updateBookingStatus', 
    description: 'Update booking status' 
  })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('HOTEL_ADMIN', 'HOTEL_STAFF')
  async updateBookingStatus(
    @Args('input') input: UpdateBookingStatusInput,
    @GqlCurrentUser() user: any,
  ) {
    return this.bookingService.updateBookingStatus(input);
  }

  /**
   * Modify booking dates/details (for guest or admin)
   */
  @Mutation(() => Booking, { 
    name: 'modifyBooking', 
    description: 'Modify booking dates and details' 
  })
  @UseGuards(GqlAuthGuard)
  async modifyBooking(
    @Args('input') input: ModifyBookingInput,
    @GqlCurrentUser() user: any,
  ) {
    return this.bookingService.modifyBooking(input);
  }
}
