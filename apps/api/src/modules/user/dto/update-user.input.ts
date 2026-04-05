import { InputType, Field } from '@nestjs/graphql';
import { IsString, IsOptional, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

@InputType({ description: 'Update user profile input' })
export class UpdateProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^[+]?[0-9]{10,15}$/, {
    message: 'Phone number must be valid',
  })
  phone?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
