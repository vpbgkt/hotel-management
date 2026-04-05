import { Resolver, Query, Mutation, Args, Int, ID, ObjectType, Field } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { InboxService } from './inbox.service';
import { GqlAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GqlCurrentUser } from '../auth/decorators/current-user.decorator';

@ObjectType()
class InboxNotification {
  @Field(() => ID)
  id: string;

  @Field()
  type: string;

  @Field()
  title: string;

  @Field({ nullable: true })
  body?: string;

  @Field({ nullable: true })
  link?: string;

  @Field()
  isRead: boolean;

  @Field()
  createdAt: Date;
}

@ObjectType()
class InboxPage {
  @Field(() => [InboxNotification])
  items: InboxNotification[];

  @Field(() => Int)
  unreadCount: number;
}

@ObjectType()
class InboxActionResult {
  @Field()
  success: boolean;
}

@Resolver()
export class InboxResolver {
  constructor(private readonly inboxService: InboxService) {}

  @UseGuards(GqlAuthGuard)
  @Query(() => InboxPage, {
    name: 'myNotifications',
    description: 'Get in-app notifications for the current user',
  })
  async getMyNotifications(
    @GqlCurrentUser() user: any,
    @Args('limit', { type: () => Int, nullable: true, defaultValue: 20 }) limit: number,
    @Args('offset', { type: () => Int, nullable: true, defaultValue: 0 }) offset: number,
  ) {
    return this.inboxService.getForUser(user.id, limit, offset);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => InboxActionResult, {
    name: 'markNotificationRead',
    description: 'Mark a single notification as read',
  })
  async markRead(
    @GqlCurrentUser() user: any,
    @Args('notificationId', { type: () => ID }) notificationId: string,
  ) {
    return this.inboxService.markRead(user.id, notificationId);
  }

  @UseGuards(GqlAuthGuard)
  @Mutation(() => InboxActionResult, {
    name: 'markAllNotificationsRead',
    description: 'Mark all notifications as read',
  })
  async markAllRead(@GqlCurrentUser() user: any) {
    return this.inboxService.markAllRead(user.id);
  }
}
