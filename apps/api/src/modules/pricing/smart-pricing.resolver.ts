import { Resolver, Query, Mutation, Args, ObjectType, Field, Float, Int, InputType } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { IsString, IsDateString, IsArray, IsNumber, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GqlCurrentUser } from '../auth/decorators/current-user.decorator';
import { SmartPricingService, PriceSuggestion as PriceSuggestionType, PricingAnalysis } from './smart-pricing.service';
import { User } from '../user/entities/user.entity';

// --- Input Types ---

@InputType()
export class PriceSuggestionsInput {
  @Field()
  @IsString()
  roomTypeId: string;

  @Field()
  @IsDateString()
  fromDate: string;

  @Field()
  @IsDateString()
  toDate: string;
}

@InputType()
class PriceApplyItem {
  @Field()
  @IsString()
  date: string;

  @Field(() => Float)
  @IsNumber()
  price: number;
}

@InputType()
export class ApplyPriceSuggestionsInput {
  @Field()
  @IsString()
  roomTypeId: string;

  @Field(() => [PriceApplyItem])
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceApplyItem)
  suggestions: PriceApplyItem[];
}

@InputType()
export class OccupancyForecastInput {
  @Field()
  @IsString()
  hotelId: string;

  @Field(() => Int, { nullable: true, defaultValue: 30 })
  @IsOptional()
  days?: number;
}

// --- Output Types ---

@ObjectType()
class PriceSuggestionGQL {
  @Field()
  date: string;

  @Field(() => Float)
  currentPrice: number;

  @Field(() => Float)
  suggestedPrice: number;

  @Field(() => Float)
  changePercent: number;

  @Field()
  reason: string;

  @Field(() => Float)
  occupancyRate: number;

  @Field()
  demandLevel: string;
}

@ObjectType()
class RevenueProjection {
  @Field(() => Float)
  current: number;

  @Field(() => Float)
  projected: number;

  @Field(() => Float)
  uplift: number;
}

@ObjectType()
class DateRange {
  @Field()
  from: string;

  @Field()
  to: string;
}

@ObjectType()
class PricingAnalysisGQL {
  @Field()
  roomTypeId: string;

  @Field()
  roomTypeName: string;

  @Field(() => Float)
  basePrice: number;

  @Field(() => DateRange)
  period: DateRange;

  @Field(() => Float)
  averageOccupancy: number;

  @Field(() => RevenueProjection)
  revenue: RevenueProjection;

  @Field(() => [PriceSuggestionGQL])
  suggestions: PriceSuggestionGQL[];
}

@ObjectType()
class ApplySuggestionsResult {
  @Field(() => Int)
  applied: number;

  @Field(() => Int)
  skipped: number;
}

@ObjectType()
class OccupancyForecastDay {
  @Field()
  date: string;

  @Field(() => Float)
  occupancyRate: number;

  @Field(() => Float)
  revenue: number;
}

// --- Resolver ---

@Resolver()
export class SmartPricingResolver {
  constructor(private readonly pricingService: SmartPricingService) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => PricingAnalysisGQL, {
    name: 'priceSuggestions',
    description: 'Get AI-powered pricing suggestions for a room type',
  })
  async getPriceSuggestions(
    @Args('input') input: PriceSuggestionsInput,
    @GqlCurrentUser() user: User,
  ): Promise<PricingAnalysis> {
    return this.pricingService.generatePriceSuggestions(
      input.roomTypeId,
      new Date(input.fromDate),
      new Date(input.toDate),
    );
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => ApplySuggestionsResult, {
    name: 'applyPriceSuggestions',
    description: 'Apply pricing suggestions to room inventory',
  })
  async applyPriceSuggestions(
    @Args('input') input: ApplyPriceSuggestionsInput,
    @GqlCurrentUser() user: User,
  ) {
    return this.pricingService.applySuggestions(
      input.roomTypeId,
      input.suggestions,
    );
  }

  @UseGuards(GqlAuthGuard)
  @Query(() => [OccupancyForecastDay], {
    name: 'occupancyForecast',
    description: 'Get occupancy forecast for the next N days',
  })
  async getOccupancyForecast(
    @Args('input') input: OccupancyForecastInput,
    @GqlCurrentUser() user: User,
  ) {
    return this.pricingService.getOccupancyForecast(
      input.hotelId,
      input.days ?? 30,
    );
  }
}
