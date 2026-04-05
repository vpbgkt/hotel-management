/**
 * Redis Service (with in-memory fallback)
 * 
 * When REDIS_ENABLED=true, uses Redis for:
 * - Caching (hotel data, room inventory)
 * - Distributed locks (prevent double booking)
 * - Rate limiting
 * 
 * When Redis is not available, falls back to an in-memory
 * Map cache and simple locks. Suitable for single-instance
 * standalone deployments.
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Conditionally import ioredis — won't crash if not installed
let Redis: any;
try {
  Redis = require('ioredis').default ?? require('ioredis');
} catch {
  Redis = null;
}

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: any | null = null;
  private useMemory = false;

  // In-memory fallback stores
  private memCache = new Map<string, { value: string; expiresAt?: number }>();
  private memLocks = new Map<string, number>(); // key → expiresAt timestamp

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const enabled = this.configService.get('REDIS_ENABLED', 'false');
    if (enabled !== 'true' || !Redis) {
      this.useMemory = true;
      this.logger.warn('Redis disabled — using in-memory cache (single-instance only)');
      // Periodic cleanup of expired entries (every 60s)
      this.startMemoryCleanup();
      return;
    }

    try {
      this.client = new Redis({
        host: this.configService.get('REDIS_HOST', 'localhost'),
        port: this.configService.get('REDIS_PORT', 6379),
        password: this.configService.get('REDIS_PASSWORD', ''),
        db: this.configService.get('REDIS_DB', 0),
        retryStrategy: (times: number) => {
          if (times > 3) {
            this.logger.error('Redis connection failed after 3 retries — falling back to memory');
            this.useMemory = true;
            this.startMemoryCleanup();
            return null;
          }
          return Math.min(times * 100, 3000);
        },
      });

      this.client.on('connect', () => {
        this.logger.log('Redis connected');
      });

      this.client.on('error', (err: Error) => {
        this.logger.error(`Redis error: ${err.message}`);
      });
    } catch {
      this.useMemory = true;
      this.logger.warn('Redis init failed — using in-memory cache');
      this.startMemoryCleanup();
    }
  }

  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  private startMemoryCleanup() {
    if (this.cleanupInterval) return;
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.memCache) {
        if (entry.expiresAt && entry.expiresAt < now) this.memCache.delete(key);
      }
      for (const [key, expiresAt] of this.memLocks) {
        if (expiresAt < now) this.memLocks.delete(key);
      }
    }, 60_000);
  }

  async onModuleDestroy() {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.client) {
      await this.client.quit();
      this.logger.log('Redis disconnected');
    }
  }

  getClient(): any | null {
    return this.client;
  }

  /**
   * Get a value from cache
   */
  async get(key: string): Promise<string | null> {
    if (this.useMemory) {
      const entry = this.memCache.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        this.memCache.delete(key);
        return null;
      }
      return entry.value;
    }
    return this.client.get(key);
  }

  /**
   * ISO 8601 date string pattern for JSON reviver
   */
  private static readonly ISO_DATE_RE =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

  /**
   * JSON reviver that converts ISO date strings back to Date objects.
   * This is needed because Redis stores JSON as plain text, and
   * Date objects become strings during serialization.
   */
  private static dateReviver(_key: string, value: unknown): unknown {
    if (typeof value === 'string' && RedisService.ISO_DATE_RE.test(value)) {
      return new Date(value);
    }
    return value;
  }

  /**
   * Get a JSON value from cache
   */
  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    return value ? JSON.parse(value, RedisService.dateReviver) : null;
  }

  /**
   * Set a value in cache
   * @param ttl Time-to-live in seconds (optional)
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (this.useMemory) {
      this.memCache.set(key, {
        value,
        expiresAt: ttl ? Date.now() + ttl * 1000 : undefined,
      });
      return;
    }
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Set a JSON value in cache
   */
  async setJson<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttl);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    if (this.useMemory) {
      this.memCache.delete(key);
      return;
    }
    await this.client.del(key);
  }

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern: string): Promise<void> {
    if (this.useMemory) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      for (const key of this.memCache.keys()) {
        if (regex.test(key)) this.memCache.delete(key);
      }
      return;
    }
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(...keys);
    }
  }

  /**
   * Acquire a distributed lock (or in-memory lock)
   * Used to prevent double bookings
   */
  async acquireLock(key: string, ttl: number = 600): Promise<boolean> {
    if (this.useMemory) {
      const now = Date.now();
      const existing = this.memLocks.get(key);
      if (existing && existing > now) return false; // Already locked
      this.memLocks.set(key, now + ttl * 1000);
      return true;
    }
    const result = await this.client.set(key, '1', 'EX', ttl, 'NX');
    return result === 'OK';
  }

  /**
   * Release a lock
   */
  async releaseLock(key: string): Promise<void> {
    if (this.useMemory) {
      this.memLocks.delete(key);
      return;
    }
    await this.client.del(key);
  }

  /**
   * Check if a lock exists
   */
  async isLocked(key: string): Promise<boolean> {
    if (this.useMemory) {
      const existing = this.memLocks.get(key);
      if (!existing || existing < Date.now()) return false;
      return true;
    }
    const exists = await this.client.exists(key);
    return exists === 1;
  }

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    if (this.useMemory) {
      const entry = this.memCache.get(key);
      const val = entry ? parseInt(entry.value, 10) + 1 : 1;
      this.memCache.set(key, { value: String(val), expiresAt: entry?.expiresAt });
      return val;
    }
    return this.client.incr(key);
  }

  /**
   * Set expiry on a key
   */
  async expire(key: string, seconds: number): Promise<void> {
    if (this.useMemory) {
      const entry = this.memCache.get(key);
      if (entry) entry.expiresAt = Date.now() + seconds * 1000;
      return;
    }
    await this.client.expire(key, seconds);
  }

  /**
   * Get hotel data from cache or fetch from DB
   * Common pattern for caching
   */
  async cacheOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 300, // 5 minutes default
  ): Promise<T> {
    // Try cache first
    const cached = await this.getJson<T>(key);
    if (cached) {
      return cached;
    }

    // Fetch from source
    const data = await fetcher();

    // Store in cache
    if (data) {
      await this.setJson(key, data, ttl);
    }

    return data;
  }
}
