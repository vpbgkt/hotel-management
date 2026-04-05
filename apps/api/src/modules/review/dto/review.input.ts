import { InputType, Field, Int, ID } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, Max, IsArray, IsUUID } from 'class-validator';

@InputType()
export class CreateReviewInput {
  @Field(() => ID)
  @IsUUID()
  bookingId: string;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  comment?: string;

  @Field(() => [String], { nullable: true, defaultValue: [] })
  @IsOptional()
  @IsArray()
  photos?: string[];
}

@InputType()
export class HotelReplyInput {
  @Field(() => ID)
  @IsUUID()
  reviewId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  reply: string;
}
