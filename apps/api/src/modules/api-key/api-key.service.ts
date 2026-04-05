import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { CreateApiKeyInput, UpdateApiKeyInput } from './dto/api-key.input';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Generate a new API key for a hotel.
   * Returns the plain-text key ONCE — it's hashed before storage.
   */
  async generateKey(input: CreateApiKeyInput, userId: string) {
    const { hotelId, name, permissions, rateLimitPerMinute, allowedOrigins, expiresAt } = input;

    // Verify the hotel exists
    const hotel = await this.prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) {
      throw new NotFoundException('Hotel not found');
    }

    // Limit: max 10 active keys per hotel
    const activeCount = await this.prisma.apiKey.count({
      where: { hotelId, isActive: true },
    });
    if (activeCount >= 10) {
      throw new ForbiddenException('Maximum of 10 active API keys per hotel');
    }

    // Generate a secure random key: bsk_<32 random bytes as hex>
    const rawKey = randomBytes(32).toString('hex');
    const plainTextKey = `bsk_${rawKey}`;
    const keyHash = createHash('sha256').update(plainTextKey).digest('hex');
    const keyPrefix = plainTextKey.substring(0, 12); // "bsk_a1b2c3d4"

    const apiKey = await this.prisma.apiKey.create({
      data: {
        hotelId,
        name,
        keyHash,
        keyPrefix,
        permissions: permissions ?? ['READ_HOTEL', 'READ_ROOMS', 'READ_AVAILABILITY', 'CREATE_BOOKING'],
        rateLimitPerMinute: rateLimitPerMinute ?? 60,
        allowedOrigins: allowedOrigins ?? [],
        expiresAt,
      },
    });

    this.logger.log(`API key created: ${keyPrefix}... for hotel ${hotelId} by user ${userId}`);

    return { apiKey, plainTextKey };
  }

  /**
   * List all API keys for a hotel (never returns the hash).
   */
  async listKeys(hotelId: string) {
    return this.prisma.apiKey.findMany({
      where: { hotelId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        hotelId: true,
        name: true,
        keyPrefix: true,
        permissions: true,
        rateLimitPerMinute: true,
        allowedOrigins: true,
        lastUsedAt: true,
        requestCount: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update an API key's settings.
   */
  async updateKey(input: UpdateApiKeyInput, hotelId: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id: input.id } });
    if (!key) {
      throw new NotFoundException('API key not found');
    }
    if (key.hotelId !== hotelId) {
      throw new ForbiddenException('API key does not belong to your hotel');
    }

    const updated = await this.prisma.apiKey.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.permissions !== undefined && { permissions: input.permissions }),
        ...(input.rateLimitPerMinute !== undefined && { rateLimitPerMinute: input.rateLimitPerMinute }),
        ...(input.allowedOrigins !== undefined && { allowedOrigins: input.allowedOrigins }),
        ...(input.expiresAt !== undefined && { expiresAt: input.expiresAt }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    // Invalidate cached key
    const cacheKey = `apikey:${key.keyHash}`;
    await this.redis.del(cacheKey);

    return updated;
  }

  /**
   * Revoke (deactivate) an API key.
   */
  async revokeKey(keyId: string, hotelId: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key) {
      throw new NotFoundException('API key not found');
    }
    if (key.hotelId !== hotelId) {
      throw new ForbiddenException('API key does not belong to your hotel');
    }

    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    // Invalidate cached key
    const cacheKey = `apikey:${key.keyHash}`;
    await this.redis.del(cacheKey);

    this.logger.log(`API key revoked: ${key.keyPrefix}... for hotel ${hotelId}`);

    return { success: true, message: 'API key revoked successfully' };
  }

  /**
   * Delete an API key permanently.
   */
  async deleteKey(keyId: string, hotelId: string) {
    const key = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key) {
      throw new NotFoundException('API key not found');
    }
    if (key.hotelId !== hotelId) {
      throw new ForbiddenException('API key does not belong to your hotel');
    }

    await this.prisma.apiKey.delete({ where: { id: keyId } });

    // Invalidate cached key
    const cacheKey = `apikey:${key.keyHash}`;
    await this.redis.del(cacheKey);

    this.logger.log(`API key deleted: ${key.keyPrefix}... for hotel ${hotelId}`);

    return { success: true, message: 'API key deleted permanently' };
  }

  /**
   * Rotate a key: revoke the old one and generate a fresh one with same settings.
   */
  async rotateKey(keyId: string, hotelId: string) {
    const oldKey = await this.prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!oldKey) {
      throw new NotFoundException('API key not found');
    }
    if (oldKey.hotelId !== hotelId) {
      throw new ForbiddenException('API key does not belong to your hotel');
    }

    // Deactivate old key
    await this.prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });

    // Invalidate old key cache
    const oldCacheKey = `apikey:${oldKey.keyHash}`;
    await this.redis.del(oldCacheKey);

    // Generate new key with same settings
    const rawKey = randomBytes(32).toString('hex');
    const plainTextKey = `bsk_${rawKey}`;
    const keyHash = createHash('sha256').update(plainTextKey).digest('hex');
    const keyPrefix = plainTextKey.substring(0, 12);

    const newKey = await this.prisma.apiKey.create({
      data: {
        hotelId: oldKey.hotelId,
        name: `${oldKey.name} (rotated)`,
        keyHash,
        keyPrefix,
        permissions: oldKey.permissions,
        rateLimitPerMinute: oldKey.rateLimitPerMinute,
        allowedOrigins: oldKey.allowedOrigins,
        expiresAt: oldKey.expiresAt,
      },
    });

    this.logger.log(`API key rotated: ${oldKey.keyPrefix}... → ${keyPrefix}... for hotel ${hotelId}`);

    return { apiKey: newKey, plainTextKey };
  }
}
