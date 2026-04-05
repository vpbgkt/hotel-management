import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as webPush from 'web-push';

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  tag?: string;
  data?: Record<string, any>;
}

/**
 * Web Push Notification Service
 * 
 * Manages push subscriptions and sends push notifications
 * using the Web Push protocol (VAPID).
 */
@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private isConfigured = false;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@hotel.local';

    if (vapidPublicKey && vapidPrivateKey) {
      webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      this.isConfigured = true;
      this.logger.log('🔔 Web Push configured with VAPID credentials');
    } else {
      this.logger.warn(
        '🔔 Web Push not configured. Set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY env vars. ' +
        'Generate keys with: npx web-push generate-vapid-keys',
      );
    }
  }

  /**
   * Save a push subscription from a client
   */
  async subscribe(subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    userId?: string;
    userAgent?: string;
  }) {
    const existing = await this.prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (existing) {
      // Update existing subscription
      await this.prisma.pushSubscription.update({
        where: { endpoint: subscription.endpoint },
        data: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userId: subscription.userId || existing.userId,
          userAgent: subscription.userAgent,
        },
      });
      return { success: true, message: 'Subscription updated' };
    }

    await this.prisma.pushSubscription.create({
      data: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userId: subscription.userId || null,
        userAgent: subscription.userAgent,
      },
    });

    this.logger.log(`Push subscription saved for user: ${subscription.userId || 'anonymous'}`);
    return { success: true, message: 'Subscribed to push notifications' };
  }

  /**
   * Remove a push subscription
   */
  async unsubscribe(endpoint: string) {
    try {
      await this.prisma.pushSubscription.delete({
        where: { endpoint },
      });
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  /**
   * Send push notification to a specific user
   */
  async sendToUser(userId: string, payload: PushPayload) {
    if (!this.isConfigured) {
      this.logger.warn(`[DEV] Push notification for user ${userId}: ${payload.title} - ${payload.body}`);
      return;
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId },
    });

    await this.sendToSubscriptions(subscriptions, payload);
  }

  /**
   * Send push notification to all subscribers (broadcast)
   */
  async broadcast(payload: PushPayload) {
    if (!this.isConfigured) {
      this.logger.warn(`[DEV] Broadcast push: ${payload.title} - ${payload.body}`);
      return;
    }

    const subscriptions = await this.prisma.pushSubscription.findMany();
    await this.sendToSubscriptions(subscriptions, payload);
  }

  /**
   * Send to a list of subscriptions, cleaning up any expired ones
   */
  private async sendToSubscriptions(
    subscriptions: Array<{ id: string; endpoint: string; p256dh: string; auth: string }>,
    payload: PushPayload,
  ) {
    const pushPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/badge-72x72.png',
      data: {
        url: payload.url || '/',
        ...payload.data,
      },
      tag: payload.tag,
    });

    const expired: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            pushPayload,
          );
        } catch (error: any) {
          if (error.statusCode === 404 || error.statusCode === 410) {
            // Subscription expired or unsubscribed
            expired.push(sub.id);
          } else {
            this.logger.error(`Push failed for ${sub.endpoint}: ${error.message}`);
          }
        }
      }),
    );

    // Clean up expired subscriptions
    if (expired.length > 0) {
      await this.prisma.pushSubscription.deleteMany({
        where: { id: { in: expired } },
      });
      this.logger.log(`Cleaned up ${expired.length} expired push subscriptions`);
    }
  }

  /**
   * Get VAPID public key for client-side subscription
   */
  getVapidPublicKey(): string | null {
    return process.env.VAPID_PUBLIC_KEY || null;
  }
}
