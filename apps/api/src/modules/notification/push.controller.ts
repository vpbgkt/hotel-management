import { Controller, Post, Delete, Get, Body, Req, Logger } from '@nestjs/common';
import { PushNotificationService } from './push.service';

@Controller('push')
export class PushController {
  private readonly logger = new Logger(PushController.name);

  constructor(private readonly pushService: PushNotificationService) {}

  /**
   * GET /api/push/vapid-key
   * Returns the VAPID public key for client-side Push API subscription
   */
  @Get('vapid-key')
  getVapidKey() {
    const key = this.pushService.getVapidPublicKey();
    return { vapidPublicKey: key };
  }

  /**
   * POST /api/push/subscribe
   * Save a push subscription from the client
   */
  @Post('subscribe')
  async subscribe(
    @Body() body: {
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
      userId?: string;
    },
    @Req() req: any,
  ) {
    const userAgent = req.headers['user-agent'];
    
    // Extract userId from JWT if present
    let userId = body.userId;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ') && !userId) {
      try {
        const jwt = require('@nestjs/jwt');
        const jwtService = new jwt.JwtService({ secret: process.env.JWT_SECRET || 'secret' });
        const payload = jwtService.verify(authHeader.substring(7));
        userId = payload.sub;
      } catch {
        // No valid token — that's ok, save as anonymous
      }
    }

    return this.pushService.subscribe({
      endpoint: body.subscription.endpoint,
      keys: body.subscription.keys,
      userId,
      userAgent,
    });
  }

  /**
   * POST /api/push/unsubscribe
   * Remove a push subscription
   */
  @Post('unsubscribe')
  async unsubscribe(@Body() body: { endpoint: string }) {
    return this.pushService.unsubscribe(body.endpoint);
  }
}
