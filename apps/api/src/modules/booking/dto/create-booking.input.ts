import { InputType, Field, Int, Float, registerEnumType } from '@nestjs/graphql';
import { 
  IsString, 
  IsOptional, 
  IsInt, 
  Min, 
  Max, 
  IsDate, 
  IsEmail, 
  IsPhoneNumber, 
  IsEnum,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingType, BookingSource, BookingStatus } from '../entities/booking.entity';

@InputType({ description: 'Guest information for booking' })
export class GuestInfoInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  phone: string;
}

@InputType({ description: 'Input for creating a daily booking' })
export class CreateDailyBookingInput {
  @Field()
  @IsString()
  hotelId: string;

  @Field()
  @IsString()
  roomTypeId: string;

  @Field()
  @Type(() => Date)
  @IsDate()
  checkInDate: Date;

  @Field()
  @Type(() => Date)
  @IsDate()
  checkOutDate: Date;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  numRooms?: number = 1;

  @Field(() => Int, { defaultValue: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  numGuests?: number = 2;

  @Field(() => Int, { defaultValue: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10)
  numExtraGuests?: number = 0;

  @Field(() => GuestInfoInput)
  @ValidateNested()
  @Type(() => GuestInfoInput)
  guestInfo: GuestInfoInput;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @Field(() => BookingSource, { defaultValue: BookingSource.DIRECT })
  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource = BookingSource.DIRECT;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  couponCode?: string;
}

@InputType({ description: 'Input for creating an hourly booking' })
export class CreateHourlyBookingInput {
  @Field()
  @IsString()
  hotelId: string;

  @Field()
  @IsString()
  roomTypeId: string;

  @Field()
  @Type(() => Date)
  @IsDate()
  date: Date;

  @Field()
  @IsString()
  checkInTime: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(24)
  numHours: number;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  numRooms?: number = 1;

  @Field(() => Int, { defaultValue: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  numGuests?: number = 2;

  @Field(() => GuestInfoInput)
  @ValidateNested()
  @Type(() => GuestInfoInput)
  guestInfo: GuestInfoInput;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  specialRequests?: string;

  @Field(() => BookingSource, { defaultValue: BookingSource.DIRECT })
  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource = BookingSource.DIRECT;
}

@InputType({ description: 'Filters for listing bookings' })
export class BookingFiltersInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  hotelId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  guestId?: string;

  @Field(() => BookingStatus, { nullable: true })
  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @Field(() => BookingType, { nullable: true })
  @IsOptional()
  @IsEnum(BookingType)
  bookingType?: BookingType;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field({ nullable: true })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  fromDate?: Date;

  @Field({ nullable: true })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  toDate?: Date;
}

@InputType({ description: 'Pagination for bookings list' })
export class BookingPaginationInput {
  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

@InputType({ description: 'Input for cancelling a booking' })
export class CancelBookingInput {
  @Field()
  @IsString()
  bookingId: string;

  @Field()
  @IsString()
  reason: string;
}

@InputType({ description: 'Input for updating booking status' })
export class UpdateBookingStatusInput {
  @Field()
  @IsString()
  bookingId: string;

  @Field(() => BookingStatus)
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  assignedRoomId?: string;
}

@InputType({ description: 'Input for modifying booking dates' })
export class ModifyBookingInput {
  @Field()
  @IsString()
  bookingId: string;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkInDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  checkOutDate?: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  numRooms?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  numGuests?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  specialRequests?: string;
}
