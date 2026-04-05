import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsEmail, IsOptional, IsInt, Min, Max, MinLength } from 'class-validator';

@InputType()
export class OnboardHotelInput {
  @Field({ description: 'Hotel name' })
  @IsString()
  @IsNotEmpty()
  hotelName: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  city: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  state: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  address: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  pincode: string;

  @Field({ description: 'Hotel phone number' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @Field({ description: 'Hotel contact email' })
  @IsEmail()
  hotelEmail: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string;

  @Field(() => Int, { nullable: true, defaultValue: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  starRating?: number;

  @Field({ nullable: true, defaultValue: 'DAILY', description: 'DAILY | HOURLY | BOTH' })
  @IsOptional()
  @IsString()
  bookingModel?: string;

  @Field({ description: 'Admin full name' })
  @IsString()
  @IsNotEmpty()
  adminName: string;

  @Field({ description: 'Admin email (for login)' })
  @IsEmail()
  adminEmail: string;

  @Field({ description: 'Admin password' })
  @IsString()
  @MinLength(6)
  adminPassword: string;

  @Field({ nullable: true, description: 'Admin phone number' })
  @IsOptional()
  @IsString()
  adminPhone?: string;

  @Field({ nullable: true, description: 'Custom domain (e.g. myhotel.in)' })
  @IsOptional()
  @IsString()
  domain?: string;
}
