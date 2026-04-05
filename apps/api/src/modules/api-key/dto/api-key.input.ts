import { InputType, Field, Int } from '@nestjs/graphql';
import { IsString, IsNotEmpty, IsOptional, IsArray, IsInt, Min, Max, IsEnum, IsDate, ArrayMaxSize, Matches } from 'class-validator';
import { ApiKeyPermission } from '../entities/api-key.entity';

@InputType()
export class CreateApiKeyInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  hotelId: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  name: string;

  @Field(() => [ApiKeyPermission], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ApiKeyPermission, { each: true })
  permissions?: ApiKeyPermission[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(1000)
  rateLimitPerMinute?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Matches(/^https?:\/\//, { each: true, message: 'Each origin must start with http:// or https://' })
  allowedOrigins?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  expiresAt?: Date;
}

@InputType()
export class UpdateApiKeyInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  name?: string;

  @Field(() => [ApiKeyPermission], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsEnum(ApiKeyPermission, { each: true })
  permissions?: ApiKeyPermission[];

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(1000)
  rateLimitPerMinute?: number;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @Matches(/^https?:\/\//, { each: true, message: 'Each origin must start with http:// or https://' })
  allowedOrigins?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  expiresAt?: Date;

  @Field({ nullable: true })
  @IsOptional()
  isActive?: boolean;
}
