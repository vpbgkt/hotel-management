import { Resolver, Query, Mutation, Args, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { UpdateProfileInput } from './dto/update-user.input';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GqlCurrentUser } from '../auth/decorators/current-user.decorator';
import { Booking } from '../booking/entities/booking.entity';
import { Review } from '../review/entities/review.entity';
import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
class DeactivateResponse {
  @Field()
  success: boolean;

  @Field()
  message: string;
}

@Resolver(() => User)
export class UserResolver {
  constructor(private readonly userService: UserService) {}

  /**
   * Get user profile
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => User, { 
    name: 'userProfile', 
    description: 'Get current user profile' 
  })
  async getUserProfile(
    @GqlCurrentUser() user: User,
  ) {
    return this.userService.findById(user.id);
  }

  /**
   * Update user profile
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => User, { 
    name: 'updateProfile', 
    description: 'Update user profile' 
  })
  async updateProfile(
    @GqlCurrentUser() user: User,
    @Args('input') input: UpdateProfileInput,
  ) {
    return this.userService.updateProfile(user.id, input);
  }

  /**
   * Get user's bookings
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => [Booking], { 
    name: 'myBookings', 
    description: 'Get current user\'s bookings' 
  })
  async getMyBookings(
    @GqlCurrentUser() user: User,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset: number,
  ) {
    return this.userService.getUserBookings(user.id, limit, offset);
  }

  /**
   * Get user's reviews
   */
  @UseGuards(GqlAuthGuard)
  @Query(() => [Review], { 
    name: 'myReviews', 
    description: 'Get current user\'s reviews' 
  })
  async getMyReviews(
    @GqlCurrentUser() user: User,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 10 }) limit: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset: number,
  ) {
    return this.userService.getUserReviews(user.id, limit, offset);
  }

  /**
   * Deactivate own account
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => DeactivateResponse, { 
    name: 'deactivateMyAccount', 
    description: 'Deactivate current user\'s account' 
  })
  async deactivateAccount(
    @GqlCurrentUser() user: User,
  ) {
    return this.userService.deactivateAccount(user.id);
  }

  /**
   * GDPR hard delete - permanently anonymizes all personal data
   */
  @UseGuards(GqlAuthGuard)
  @Mutation(() => DeactivateResponse, {
    name: 'deleteMyAccount',
    description: 'Permanently delete account and anonymize all personal data (GDPR)',
  })
  async deleteMyAccount(
    @GqlCurrentUser() user: User,
  ) {
    return this.userService.deleteAccount(user.id);
  }
}
