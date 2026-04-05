import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InboxService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an in-app notification
   */
  async create(data: {
    userId: string;
    type: string;
    title: string;
    body?: string;
    link?: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  /**
   * Get notifications for a user
   */
  async getForUser(userId: string, limit = 20, offset = 0) {
    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.notification.count({
        where: { userId, isRead: false },
      }),
    ]);

    return { items, unreadCount };
  }

  /**
   * Mark a notification as read
   */
  async markRead(userId: string, notificationId: string) {
    await this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
    return { success: true };
  }

  /**
   * Mark all notifications as read
   */
  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true };
  }
}
