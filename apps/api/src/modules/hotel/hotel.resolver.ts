import { Resolver, Query, Args, ID } from '@nestjs/graphql';
import { HotelService } from './hotel.service';
import { Hotel, PaginatedHotels } from './entities/hotel.entity';
import { HotelFiltersInput, HotelPaginationInput } from './dto/hotel-filters.input';

@Resolver(() => Hotel)
export class HotelResolver {
  constructor(private readonly hotelService: HotelService) {}

  /**
   * Get paginated list of hotels with optional filters
   */
  @Query(() => PaginatedHotels, { name: 'hotels', description: 'Get paginated hotels' })
  async getHotels(
    @Args('filters', { nullable: true }) filters?: HotelFiltersInput,
    @Args('pagination', { nullable: true }) pagination?: HotelPaginationInput,
  ) {
    return this.hotelService.findMany(filters, pagination);
  }

  /**
   * Get hotel by ID
   */
  @Query(() => Hotel, { name: 'hotel', description: 'Get hotel by ID' })
  async getHotelById(
    @Args('id', { type: () => ID }) id: string,
  ) {
    return this.hotelService.findById(id);
  }

  /**
   * Get hotel by slug
   */
  @Query(() => Hotel, { name: 'hotelBySlug', description: 'Get hotel by slug', nullable: true })
  async getHotelBySlug(
    @Args('slug') slug: string,
  ) {
    return this.hotelService.findBySlug(slug);
  }

  /**
   * Get featured hotels for homepage
   */
  @Query(() => [Hotel], { name: 'featuredHotels', description: 'Get featured hotels' })
  async getFeaturedHotels(
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 6 }) limit: number,
  ) {
    return this.hotelService.getFeatured(limit);
  }

  /**
   * Quick search hotels by text
   */
  @Query(() => [Hotel], { name: 'searchHotels', description: 'Quick search hotels' })
  async searchHotels(
    @Args('query') query: string,
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 10 }) limit: number,
  ) {
    return this.hotelService.search(query, limit);
  }

  /**
   * Get popular cities with hotel counts
   */
  @Query(() => [PopularCity], { name: 'popularCities', description: 'Get popular cities' })
  async getPopularCities(
    @Args('limit', { type: () => Number, nullable: true, defaultValue: 10 }) limit: number,
  ) {
    return this.hotelService.getPopularCities(limit);
  }
}

// Helper type for popular cities
import { ObjectType, Field, Int } from '@nestjs/graphql';

@ObjectType()
class PopularCity {
  @Field()
  city: string;

  @Field()
  state: string;

  @Field(() => Int)
  hotelCount: number;
}
