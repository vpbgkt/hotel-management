import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { HotelFiltersInput, HotelPaginationInput, HotelSortBy, SortOrder } from './dto/hotel-filters.input';
import { Prisma } from '@prisma/client';

@Injectable()
export class HotelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  private readonly CACHE_TTL = 300; // 5 minutes

  /**
   * Get paginated hotels with filters
   */
  async findMany(
    filters?: HotelFiltersInput,
    pagination?: HotelPaginationInput,
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 12;
    const skip = (page - 1) * limit;

    // Build where clause
    const where = this.buildWhereClause(filters);

    // Build order by
    const orderBy = this.buildOrderBy(pagination?.sortBy, pagination?.sortOrder);

    // Generate cache key based on filters and pagination
    const cacheKey = `hotels:list:${JSON.stringify({ filters, pagination })}`;

    // Try cache first
    return this.redis.cacheOrFetch(
      cacheKey,
      async () => {
        const [hotels, total] = await Promise.all([
          this.prisma.hotel.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: {
              roomTypes: {
                where: { isActive: true },
                orderBy: { sortOrder: 'asc' },
              },
              reviews: {
                where: { isPublished: true },
                select: { rating: true },
              },
            },
          }),
          this.prisma.hotel.count({ where }),
        ]);

        // Transform to include computed fields
        let transformedHotels = hotels.map((hotel) => ({
          ...hotel,
          averageRating: this.calculateAverageRating(hotel.reviews),
          reviewCount: hotel.reviews.length,
          startingPrice: this.getStartingPrice(hotel.roomTypes),
        }));

        // Post-query sort by price (needs computed startingPrice)
        if (pagination?.sortBy === HotelSortBy.PRICE) {
          const dir = (pagination?.sortOrder || SortOrder.ASC) === SortOrder.ASC ? 1 : -1;
          transformedHotels = transformedHotels.sort((a, b) => {
            const pa = a.startingPrice ?? Infinity;
            const pb = b.startingPrice ?? Infinity;
            return (pa - pb) * dir;
          });
        }

        return {
          hotels: transformedHotels,
          total,
          page,
          limit,
          hasMore: skip + hotels.length < total,
        };
      },
      this.CACHE_TTL,
    );
  }

  /**
   * Get hotel by ID
   */
  async findById(id: string) {
    const cacheKey = `hotel:${id}`;

    return this.redis.cacheOrFetch(
      cacheKey,
      async () => {
        const hotel = await this.prisma.hotel.findUnique({
          where: { id },
          include: {
            roomTypes: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              include: {
                rooms: {
                  where: { status: 'AVAILABLE' },
                },
              },
            },
            reviews: {
              where: { isPublished: true },
              take: 10,
              orderBy: { createdAt: 'desc' },
              include: {
                guest: {
                  select: { name: true, avatarUrl: true },
                },
              },
            },
            media: {
              orderBy: { sortOrder: 'asc' },
            },
            seoMeta: true,
          },
        });

        if (!hotel) {
          throw new NotFoundException(`Hotel with ID ${id} not found`);
        }

        return {
          ...hotel,
          averageRating: this.calculateAverageRating(hotel.reviews),
          reviewCount: hotel.reviews.length,
          startingPrice: this.getStartingPrice(hotel.roomTypes),
        };
      },
      this.CACHE_TTL,
    );
  }

  /**
   * Get hotel by slug
   */
  async findBySlug(slug: string) {
    const cacheKey = `hotel:slug:${slug}`;

    return this.redis.cacheOrFetch(
      cacheKey,
      async () => {
        const hotel = await this.prisma.hotel.findUnique({
          where: { slug },
          include: {
            roomTypes: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
            },
            reviews: {
              where: { isPublished: true },
              take: 10,
              orderBy: { createdAt: 'desc' },
              include: {
                guest: {
                  select: { name: true, avatarUrl: true },
                },
              },
            },
            media: {
              orderBy: { sortOrder: 'asc' },
            },
            seoMeta: true,
          },
        });

        if (!hotel) {
          throw new NotFoundException(`Hotel with slug "${slug}" not found`);
        }

        return {
          ...hotel,
          averageRating: this.calculateAverageRating(hotel.reviews),
          reviewCount: hotel.reviews.length,
          startingPrice: this.getStartingPrice(hotel.roomTypes),
        };
      },
      this.CACHE_TTL,
    );
  }

  /**
   * Get featured hotels for homepage
   */
  async getFeatured(limit = 6) {
    const cacheKey = `hotels:featured:${limit}`;

    return this.redis.cacheOrFetch(
      cacheKey,
      async () => {
        const hotels = await this.prisma.hotel.findMany({
          where: {
            isActive: true,
          },
          take: limit,
          orderBy: [
            { starRating: 'desc' },
            { createdAt: 'desc' },
          ],
          include: {
            roomTypes: {
              where: { isActive: true },
              select: { basePriceDaily: true },
            },
            reviews: {
              where: { isPublished: true },
              select: { rating: true },
            },
          },
        });

        return hotels.map((hotel) => ({
          ...hotel,
          averageRating: this.calculateAverageRating(hotel.reviews),
          reviewCount: hotel.reviews.length,
          startingPrice: this.getStartingPrice(hotel.roomTypes),
        }));
      },
      this.CACHE_TTL,
    );
  }

  /**
   * Search hotels by text query
   */
  async search(query: string, limit = 10) {
    const cacheKey = `hotels:search:${query}:${limit}`;

    return this.redis.cacheOrFetch(
      cacheKey,
      async () => {
        const hotels = await this.prisma.hotel.findMany({
          where: {
            isActive: true,
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { city: { contains: query, mode: 'insensitive' } },
              { state: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
          },
          take: limit,
          select: {
            id: true,
            name: true,
            slug: true,
            city: true,
            state: true,
            heroImageUrl: true,
            starRating: true,
          },
        });

        return hotels;
      },
      60, // 1 minute cache for search
    );
  }

  /**
   * Get popular cities with hotel counts
   */
  async getPopularCities(limit = 10) {
    const cacheKey = `hotels:cities:${limit}`;

    return this.redis.cacheOrFetch(
      cacheKey,
      async () => {
        const cities = await this.prisma.hotel.groupBy({
          by: ['city', 'state'],
          where: { isActive: true },
          _count: { city: true },
          orderBy: { _count: { city: 'desc' } },
          take: limit,
        });

        return cities.map((c) => ({
          city: c.city,
          state: c.state,
          hotelCount: c._count.city,
        }));
      },
      this.CACHE_TTL * 2, // 10 minutes
    );
  }

  // ============================================
  // Private helper methods
  // ============================================

  private buildWhereClause(filters?: HotelFiltersInput): Prisma.HotelWhereInput {
    const where: Prisma.HotelWhereInput = {
      isActive: true,
    };

    if (!filters) return where;

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { city: { contains: filters.search, mode: 'insensitive' } },
        { state: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters.city) {
      where.city = { equals: filters.city, mode: 'insensitive' };
    }

    if (filters.state) {
      where.state = { equals: filters.state, mode: 'insensitive' };
    }

    if (filters.minRating) {
      where.starRating = { gte: filters.minRating };
    }

    // Price filter requires joining with room types
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      where.roomTypes = {
        some: {
          isActive: true,
          ...(filters.minPrice !== undefined && { basePriceDaily: { gte: filters.minPrice } }),
          ...(filters.maxPrice !== undefined && { basePriceDaily: { lte: filters.maxPrice } }),
        },
      };
    }

    // Amenities filter
    if (filters.amenities && filters.amenities.length > 0) {
      where.roomTypes = {
        some: {
          isActive: true,
          amenities: { hasSome: filters.amenities },
        },
      };
    }

    return where;
  }

  private buildOrderBy(
    sortBy?: HotelSortBy,
    sortOrder?: SortOrder,
  ): Prisma.HotelOrderByWithRelationInput[] {
    const order = sortOrder || SortOrder.DESC;

    // PRICE sorting is handled post-query since it depends on aggregated room data
    if (sortBy === HotelSortBy.PRICE) {
      return [{ createdAt: 'desc' }];
    }

    const orderByMap: Record<string, Prisma.HotelOrderByWithRelationInput> = {
      [HotelSortBy.NAME]: { name: order },
      [HotelSortBy.RATING]: { starRating: order },
      [HotelSortBy.CREATED_AT]: { createdAt: order },
    };

    return [
      orderByMap[sortBy || HotelSortBy.CREATED_AT],
      { createdAt: 'desc' },
    ];
  }

  private calculateAverageRating(reviews: { rating: number }[]): number | null {
    if (!reviews || reviews.length === 0) return null;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }

  private getStartingPrice(
    roomTypes: { basePriceDaily: number; basePriceHourly?: number | null }[],
  ): number | null {
    if (!roomTypes || roomTypes.length === 0) return null;
    const prices = roomTypes.map((rt) => rt.basePriceDaily).filter(Boolean);
    return prices.length > 0 ? Math.min(...prices) : null;
  }
}
