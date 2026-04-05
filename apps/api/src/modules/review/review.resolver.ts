import { Resolver, Query, Mutation, Args, ID, Int, ObjectType, Field } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ReviewService } from './review.service';
import { Review, ReviewStats } from './entities/review.entity';
import { CreateReviewInput, HotelReplyInput } from './dto/review.input';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GqlCurrentUser } from '../auth/decorators/current-user.decorator';

@ObjectType()
class ReviewsPage {
  @Field(() => [Review])
  reviews: Review[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  totalPages: number;
}

@Resolver()
export class ReviewResolver {
  constructor(private readonly reviewService: ReviewService) {}

  // ---------- Public queries ----------

  @Query(() => ReviewsPage, {
    name: 'hotelReviews',
    description: 'Get published reviews for a hotel',
  })
  async getHotelReviews(
    @Args('hotelId', { type: () => ID }) hotelId: string,
    @Args('page', { type: () => Int, nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
    @Args('sortBy', { nullable: true, defaultValue: 'newest' }) sortBy: string,
  ) {
    return this.reviewService.getHotelReviews(hotelId, { page, limit, sortBy });
  }

  @Query(() => ReviewStats, {
    name: 'hotelReviewStats',
    description: 'Get review stats for a hotel',
  })
  async getReviewStats(
    @Args('hotelId', { type: () => ID }) hotelId: string,
  ) {
    return this.reviewService.getReviewStats(hotelId);
  }

  @Query(() => Boolean, {
    name: 'canReviewBooking',
    description: 'Check if a booking can be reviewed',
  })
  @UseGuards(GqlAuthGuard)
  async canReview(
    @Args('bookingId', { type: () => ID }) bookingId: string,
    @GqlCurrentUser() user: any,
  ) {
    return this.reviewService.canReview(bookingId, user.id);
  }

  // ---------- Guest mutations ----------

  @Mutation(() => Review, {
    name: 'createReview',
    description: 'Submit a review for a completed booking',
  })
  @UseGuards(GqlAuthGuard)
  async createReview(
    @Args('input') input: CreateReviewInput,
    @GqlCurrentUser() user: any,
  ) {
    return this.reviewService.createReview(user.id, input);
  }

  // ---------- Hotel admin queries/mutations ----------

  @Query(() => [Review], {
    name: 'myGuestReviews',
    description: 'Get all reviews submitted by the logged-in guest',
  })
  @UseGuards(GqlAuthGuard)
  async getMyReviews(@GqlCurrentUser() user: any) {
    return this.reviewService.getGuestReviews(user.id);
  }

  @Mutation(() => Review, {
    name: 'replyToReview',
    description: 'Hotel admin replies to a guest review',
  })
  @UseGuards(GqlAuthGuard)
  async replyToReview(
    @Args('input') input: HotelReplyInput,
    @GqlCurrentUser() user: any,
  ) {
    // user.hotelId should be set for HOTEL_ADMIN users
    if (!user.hotelId) {
      throw new Error('Only hotel admins can reply to reviews');
    }
    return this.reviewService.replyToReview(user.hotelId, input);
  }

  @Query(() => [Review], {
    name: 'hotelAllReviews',
    description: 'Get all reviews for hotel (admin view, includes unpublished)',
  })
  @UseGuards(GqlAuthGuard)
  async getHotelAllReviews(@GqlCurrentUser() user: any) {
    if (!user.hotelId) {
      throw new Error('Only hotel admins can view all reviews');
    }
    return this.reviewService.getHotelAllReviews(user.hotelId);
  }

  @Mutation(() => Review, {
    name: 'approveReview',
    description: 'Approve and publish a guest review',
  })
  @UseGuards(GqlAuthGuard)
  async approveReview(
    @Args('reviewId', { type: () => ID }) reviewId: string,
    @GqlCurrentUser() user: any,
  ) {
    if (!user.hotelId) throw new Error('Only hotel admins can approve reviews');
    return this.reviewService.approveReview(user.hotelId, reviewId);
  }

  @Mutation(() => Review, {
    name: 'rejectReview',
    description: 'Reject / unpublish a guest review',
  })
  @UseGuards(GqlAuthGuard)
  async rejectReview(
    @Args('reviewId', { type: () => ID }) reviewId: string,
    @GqlCurrentUser() user: any,
  ) {
    if (!user.hotelId) throw new Error('Only hotel admins can reject reviews');
    return this.reviewService.rejectReview(user.hotelId, reviewId);
  }
}
