import { InputType, Field } from '@nestjs/graphql';
import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsEnum,
  IsArray,
  MaxLength,
} from 'class-validator';

enum PostStatusInput {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

@InputType({ description: 'Create a new blog post' })
export class CreateBlogPostInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  slug?: string; // auto-generated if not provided

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @Field()
  @IsString()
  @IsNotEmpty()
  content: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  hotelId?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  metaDescription?: string;
}

@InputType({ description: 'Update a blog post' })
export class UpdateBlogPostInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  id: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  slug?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  excerpt?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  content?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  coverImage?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  category?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  tags?: string[];

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  metaDescription?: string;
}
