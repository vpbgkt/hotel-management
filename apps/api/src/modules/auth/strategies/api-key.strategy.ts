/**
 * API Key Authentication Strategy
 *
 * Validates API keys passed via x-api-key header.
 * Scopes requests to the hotel associated with the key.
 * Checks permissions, rate limits, expiry, and allowed origins.
 */

import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Strategy } = require('passport-custom');
import { Request } from 'express';
import { createHash } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(Strategy, 'api-key') {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super();
  }

  async validate(req: Request): Promise<any> {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    // Hash the key to look it up (we never store plaintext)
    const keyHash = createHash('sha256').update(apiKey).digest('hex');

    // Check Redis cache first (avoid DB hit on every request)
    const cacheKey = `apikey:${keyHash}`;
    const cached = await this.redis.get(cacheKey);

    let keyRecord: any;
    if (cached) {
      keyRecord = JSON.parse(cached);
    } else {
      keyRecord = await this.prisma.apiKey.findUnique({
        where: { keyHash },
        include: {
          hotel: { select: { id: true, name: true, isActive: true } },
        },
      });

      if (keyRecord) {
        // Cache for 5 minutes
        await this.redis.set(cacheKey, JSON.stringify(keyRecord), 300);
      }
    }

    if (!keyRecord) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (!keyRecord.isActive) {
      throw new ForbiddenException('API key is deactivated');
    }

    if (keyRecord.expiresAt && new Date(keyRecord.expiresAt) < new Date()) {
      throw new ForbiddenException('API key has expired');
    }

    if (!keyRecord.hotel?.isActive) {
      throw new ForbiddenException('Hotel is not active');
    }

    // Check allowed origins (CORS enforcement at auth level)
    if (keyRecord.allowedOrigins?.length > 0) {
      const origin = req.headers['origin'] as string;
      if (origin && !keyRecord.allowedOrigins.includes(origin)) {
        throw new ForbiddenException('Origin not allowed for this API key');
      }
    }

    // Rate limiting via Redis
    const rateLimitKey = `ratelimit:apikey:${keyRecord.id}`;
    const currentCount = await this.redis.incr(rateLimitKey);
    if (currentCount === 1) {
      await this.redis.expire(rateLimitKey, 60); // 1-minute window
    }
    if (currentCount > keyRecord.rateLimitPerMinute) {
      throw new ForbiddenException('Rate limit exceeded');
    }

    // Update usage stats (fire-and-forget, don't block request)
    this.prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: {
        lastUsedAt: new Date(),
        requestCount: { increment: 1 },
      },
    }).catch(() => { /* non-critical */ });

    // Return a user-like object that works with existing guards
    return {
      id: `apikey:${keyRecord.id}`,
      role: 'HOTEL_ADMIN', // API keys act with hotel admin privileges
      hotelId: keyRecord.hotelId,
      isApiKey: true,
      apiKeyId: keyRecord.id,
      permissions: keyRecord.permissions,
      hotel: keyRecord.hotel,
    };
  }
}
