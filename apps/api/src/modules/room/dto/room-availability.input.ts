import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, Min, Max, IsDate, IsNumber, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

@InputType({ description: 'Input for checking room availability' })
export class CheckAvailabilityInput {
  @Field()
  @IsString()
  hotelId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  roomTypeId?: string;

  @Field()
  @Type(() => Date)
  @IsDate()
  checkInDate: Date;

  @Field({ nullable: true })
  @Type(() => Date)
  @IsOptional()
  @IsDate()
  checkOutDate?: Date;

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
}

@InputType({ description: 'Input for checking hourly slot availability' })
export class CheckHourlyAvailabilityInput {
  @Field()
  @IsString()
  hotelId: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  roomTypeId?: string;

  @Field()
  @Type(() => Date)
  @IsDate()
  date: Date;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  startTime?: string;

  @Field(() => Int, { defaultValue: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  numHours?: number = 3;

  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  numRooms?: number = 1;
}

@InputType({ description: 'Input for fetching room types' })
export class RoomTypeFiltersInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  hotelId?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  minGuests?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  maxPrice?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  amenities?: string[];

  @Field({ nullable: true })
  @IsOptional()
  includeHourly?: boolean;
}
