import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { RoomService } from './room.service';
import { RoomType, RoomAvailability, HourlyAvailability } from './entities/room-type.entity';
import { 
  CheckAvailabilityInput, 
  CheckHourlyAvailabilityInput,
  RoomTypeFiltersInput 
} from './dto/room-availability.input';
import { ObjectType, Field, Int, Float } from '@nestjs/graphql';

// Response types for availability checks - Order matters for decorators!
@ObjectType()
class RoomTypeSummary {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field(() => Float)
  basePriceDaily: number;

  @Field(() => Int)
  maxGuests: number;

  @Field(() => [String])
  amenities: string[];

  @Field(() => [String])
  images: string[];
}

@ObjectType()
class RoomTypeAvailability {
  @Field(() => RoomTypeSummary)
  roomType: RoomTypeSummary;

  @Field(() => Int)
  nights: number;

  @Field(() => Int)
  minAvailable: number;

  @Field()
  isAvailable: boolean;

  @Field(() => Float)
  totalPrice: number;

  @Field(() => Float)
  pricePerNight: number;
}

@ObjectType()
class DailyAvailabilityResult {
  @Field()
  hotelId: string;

  @Field()
  checkIn: Date;

  @Field()
  checkOut: Date;

  @Field(() => Int)
  nights: number;

  @Field(() => Int)
  numRooms: number;

  @Field(() => [RoomTypeAvailability])
  roomTypes: RoomTypeAvailability[];

  @Field(() => [RoomTypeAvailability])
  unavailableRoomTypes: RoomTypeAvailability[];
}

@ObjectType()
class HourlySlotInfo {
  @Field()
  startTime: string;

  @Field()
  endTime: string;

  @Field(() => Int)
  available: number;

  @Field(() => Float)
  price: number;

  @Field()
  isClosed: boolean;
}

@ObjectType()
class HourlyRoomTypeSummary {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field(() => Float, { nullable: true })
  basePriceHourly?: number;

  @Field(() => [String], { nullable: true })
  amenities?: string[];

  @Field(() => [String], { nullable: true })
  images?: string[];
}

@ObjectType()
class HourlyRoomTypeAvailability {
  @Field(() => HourlyRoomTypeSummary)
  roomType: HourlyRoomTypeSummary;

  @Field(() => Int)
  minHours: number;

  @Field(() => Int)
  maxHours: number;

  @Field(() => [HourlySlotInfo])
  slots: HourlySlotInfo[];

  @Field()
  isAvailable: boolean;
}

@ObjectType()
class HourlyAvailabilityResult {
  @Field()
  hotelId: string;

  @Field()
  date: Date;

  @Field(() => Int)
  numHours: number;

  @Field(() => Int)
  numRooms: number;

  @Field(() => [HourlyRoomTypeAvailability])
  roomTypes: HourlyRoomTypeAvailability[];
}

@ObjectType()
class CalendarDay {
  @Field()
  date: string;

  @Field(() => Int)
  available: number;

  @Field(() => Float)
  price: number;

  @Field()
  isClosed: boolean;
}

@ObjectType()
class AvailabilityCalendar {
  @Field()
  roomTypeId: string;

  @Field()
  roomTypeName: string;

  @Field(() => Float)
  basePriceDaily: number;

  @Field(() => Int)
  totalRooms: number;

  @Field(() => [CalendarDay])
  calendar: CalendarDay[];
}

@Resolver(() => RoomType)
export class RoomResolver {
  constructor(private readonly roomService: RoomService) {}

  /**
   * Get room types for a hotel
   */
  @Query(() => [RoomType], { name: 'roomTypes', description: 'Get room types for a hotel' })
  async getRoomTypes(
    @Args('hotelId', { type: () => ID }) hotelId: string,
    @Args('filters', { nullable: true }) filters?: RoomTypeFiltersInput,
  ) {
    return this.roomService.getRoomTypes(hotelId, filters);
  }

  /**
   * Get room type by ID
   */
  @Query(() => RoomType, { name: 'roomType', description: 'Get room type by ID' })
  async getRoomTypeById(
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.roomService.getRoomTypeById(id);
  }

  /**
   * Check daily availability
   */
  @Query(() => DailyAvailabilityResult, { 
    name: 'checkDailyAvailability', 
    description: 'Check room availability for daily booking' 
  })
  async checkDailyAvailability(
    @Args('input') input: CheckAvailabilityInput,
  ) {
    return this.roomService.checkDailyAvailability(input);
  }

  /**
   * Check hourly availability
   */
  @Query(() => HourlyAvailabilityResult, { 
    name: 'checkHourlyAvailability', 
    description: 'Check room availability for hourly booking' 
  })
  async checkHourlyAvailability(
    @Args('input') input: CheckHourlyAvailabilityInput,
  ) {
    return this.roomService.checkHourlyAvailability(input);
  }

  /**
   * Get availability calendar for a room type
   */
  @Query(() => AvailabilityCalendar, { 
    name: 'availabilityCalendar', 
    description: 'Get availability calendar for a room type' 
  })
  async getAvailabilityCalendar(
    @Args('roomTypeId', { type: () => ID }) roomTypeId: string,
    @Args('startDate') startDate: Date,
    @Args('endDate') endDate: Date,
  ) {
    return this.roomService.getAvailabilityCalendar(roomTypeId, startDate, endDate);
  }
}
