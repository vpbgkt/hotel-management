import { InputType, Field, Int, Float, registerEnumType } from '@nestjs/graphql';
import { IsString, IsOptional, IsInt, Min, Max, IsEnum, IsBoolean, IsNumber } from 'class-validator';

export enum HotelSortBy {
  NAME = 'name',
  RATING = 'rating',
  PRICE = 'price',
  CREATED_AT = 'createdAt',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

registerEnumType(HotelSortBy, {
  name: 'HotelSortBy',
  description: 'Field to sort hotels by',
});

registerEnumType(SortOrder, {
  name: 'SortOrder',
  description: 'Sort order',
});

@InputType()
export class HotelFiltersInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  search?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  city?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  state?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  minRating?: number;

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
  amenities?: string[];

  // For availability check
  @Field({ nullable: true })
  @IsOptional()
  checkInDate?: Date;

  @Field({ nullable: true })
  @IsOptional()
  checkOutDate?: Date;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  guests?: number;
}

@InputType()
export class HotelPaginationInput {
  @Field(() => Int, { defaultValue: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @Field(() => Int, { defaultValue: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @Field(() => HotelSortBy, { nullable: true, defaultValue: HotelSortBy.CREATED_AT })
  @IsOptional()
  @IsEnum(HotelSortBy)
  sortBy?: HotelSortBy = HotelSortBy.CREATED_AT;

  @Field(() => SortOrder, { nullable: true, defaultValue: SortOrder.DESC })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.DESC;
}
