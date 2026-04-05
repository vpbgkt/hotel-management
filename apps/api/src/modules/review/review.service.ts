import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { NotificationService } from '../notification/notification.service';
import { CreateReviewInput, HotelReplyInput } from './dto/review.input';

@Injectable()
export class ReviewService {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Create a review for a completed booking
   */
  async createReview(guestId: string, input: CreateReviewInput) {
    // Verify booking exists and belongs to this guest
    const booking = await this.prisma.booking.findUnique({
      where: { id: input.bookingId },
      include: { review: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.guestId !== guestId) {
      throw new ForbiddenException('You can only review your own bookings');
    }

    if (booking.status !== 'CHECKED_OUT') {
      throw new BadRequestException('You can only review after checkout');
    }

    if (booking.review) {
      throw new BadRequestException('This booking has already been reviewed');
    }

    const review = await this.prisma.review.create({
      data: {
        hotelId: booking.hotelId,
        bookingId: booking.id,
        guestId,
        rating: input.rating,
        title: input.title,
        comment: input.comment,
        photos: input.photos || [],
        isVerified: true,
        isPublished: false, // Pending moderation
      },
      include: {
        guest: { select: { name: true, avatarUrl: true } },
      },
    });

    // Invalidate review caches for this hotel
    await this.redis.delPattern(`reviews:hotel:${booking.hotelId}:*`);
    await this.redis.del(`reviews:stats:${booking.hotelId}`);

    // Notify hotel of new review (fire and forget)
    this.notifications.notifyNewReview(review.id).catch(() => {});

    return review;
  }

  /**
   * Get reviews for a hotel (published only for public)
   */
  async getHotelReviews(
    hotelId: string,
    opts: { page?: number; limit?: number; sortBy?: string } = {},
  ) {
    const { page = 1, limit = 10, sortBy = 'newest' } = opts;
    const skip = (page - 1) * limit;

    const orderBy: any =
      sortBy === 'highest'
        ? { rating: 'desc' as const }
        : sortBy === 'lowest'
          ? { rating: 'asc' as const }
          : { createdAt: 'desc' as const };

    const cacheKey = `reviews:hotel:${hotelId}:${page}:${limit}:${sortBy}`;

    return this.redis.cacheOrFetch(
      cacheKey,
      async () => {
        const [reviews, total] = await Promise.all([
          this.prisma.review.findMany({
            where: { hotelId, isPublished: true },
            orderBy,
            skip,
            take: limit,
            include: {
              guest: { select: { name: true, avatarUrl: true } },
            },
          }),
          this.prisma.review.count({ where: { hotelId, isPublished: true } }),
        ]);

        return { reviews, total, page, totalPages: Math.ceil(total / limit) };
      },
      this.CACHE_TTL,
    );
  }

  /**
   * Get review stats for a hotel
   */
  async getReviewStats(hotelId: string) {
    const cacheKey = `reviews:stats:${hotelId}`;

    return this.redis.cacheOrFetch(
      cacheKey,
      async () => {
        const reviews = await this.prisma.review.findMany({
          where: { hotelId, isPublished: true },
          select: { rating: true },
        });

        const total = reviews.length;
        if (total === 0) {
          return {
            averageRating: 0,
            totalReviews: 0,
            ratingDistribution: [0, 0, 0, 0, 0],
          };
        }

        const sum = reviews.reduce((a, r) => a + r.rating, 0);
        const dist = [0, 0, 0, 0, 0];
        reviews.forEach((r) => dist[r.rating - 1]++);

        return {
          averageRating: Math.round((sum / total) * 10) / 10,
          totalReviews: total,
          ratingDistribution: dist,
        };
      },
      this.CACHE_TTL,
    );
  }

  /**
   * Hotel admin replies to a review
   */
  async replyToReview(hotelId: string, input: HotelReplyInput) {
    const review = await this.prisma.review.findUnique({
      where: { id: input.reviewId },
    });

    if (!review) throw new NotFoundException('Review not found');
    if (review.hotelId !== hotelId) throw new ForbiddenException('Not your hotel review');

    const updated = await this.prisma.review.update({
      where: { id: input.reviewId },
      data: { hotelReply: input.reply },
      include: {
        guest: { select: { name: true, avatarUrl: true } },
      },
    });

    // Invalidate caches
    await this.redis.delPattern(`reviews:hotel:${review.hotelId}:*`);

    return updated;
  }

  /**
   * Get reviews for a guest (their own reviews)
   */
  async getGuestReviews(guestId: string) {
    return this.prisma.review.findMany({
      where: { guestId },
      orderBy: { createdAt: 'desc' },
      include: {
        hotel: { select: { name: true, slug: true, city: true } },
        guest: { select: { name: true, avatarUrl: true } },
      },
    });
  }

  /**
   * Check if a booking can be reviewed
   */
  async canReview(bookingId: string, guestId: string): Promise<boolean> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { review: true },
    });

    if (!booking) return false;
    if (booking.guestId !== guestId) return false;
    if (booking.status !== 'CHECKED_OUT') return false;
    if (booking.review) return false;

    return true;
  }

  /**
   * Get all reviews for a hotel (admin view - includes unpublished)
   */
  async getHotelAllReviews(hotelId: string) {
    return this.prisma.review.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
      include: {
        guest: { select: { name: true, avatarUrl: true } },
        booking: { select: { checkInDate: true, checkOutDate: true, totalAmount: true } },
      },
    });
  }

  /**
   * Approve a review (hotel admin publishes it)
   */
  async approveReview(hotelId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.hotelId !== hotelId) throw new ForbiddenException('Not your hotel review');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { isPublished: true },
      include: { guest: { select: { name: true, avatarUrl: true } } },
    });

    await this.redis.delPattern(`reviews:hotel:${hotelId}:*`);
    await this.redis.del(`reviews:stats:${hotelId}`);

    return updated;
  }

  /**
   * Reject / unpublish a review with optional reason
   */
  async rejectReview(hotelId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    if (review.hotelId !== hotelId) throw new ForbiddenException('Not your hotel review');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { isPublished: false },
      include: { guest: { select: { name: true, avatarUrl: true } } },
    });

    await this.redis.delPattern(`reviews:hotel:${hotelId}:*`);
    await this.redis.del(`reviews:stats:${hotelId}`);

    return updated;
  }
}
