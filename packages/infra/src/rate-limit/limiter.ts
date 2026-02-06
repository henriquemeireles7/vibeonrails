/**
 * Rate Limiting — Sliding Window Implementation
 *
 * Implements a sliding window rate limiter using either Redis or an in-memory store.
 * The sliding window approach provides smoother rate limiting than fixed windows.
 */

import {
  type RateLimitConfig,
  type RateLimiter,
  type RateLimitInfo,
  RateLimitConfigSchema,
} from './types.js';

// ---------------------------------------------------------------------------
// Redis Interface (minimal — avoids hard dep on ioredis)
// ---------------------------------------------------------------------------

export interface RedisLike {
  multi(): RedisPipeline;
  del(key: string): Promise<number>;
}

export interface RedisPipeline {
  zremrangebyscore(key: string, min: number, max: number): RedisPipeline;
  zadd(key: string, score: number, member: string): RedisPipeline;
  zcount(key: string, min: string | number, max: string | number): RedisPipeline;
  expire(key: string, seconds: number): RedisPipeline;
  exec(): Promise<Array<[Error | null, unknown]>>;
}

// ---------------------------------------------------------------------------
// Redis-backed Sliding Window Rate Limiter
// ---------------------------------------------------------------------------

/**
 * Create a Redis-backed sliding window rate limiter.
 */
export function createRedisRateLimiter(
  redis: RedisLike,
  config: RateLimitConfig,
): RateLimiter {
  const validConfig = RateLimitConfigSchema.parse(config);

  function buildKey(identifier: string): string {
    return `${validConfig.keyPrefix}${identifier}`;
  }

  return {
    async check(identifier: string): Promise<RateLimitInfo> {
      const key = buildKey(identifier);
      const now = Date.now();
      const windowStart = now - validConfig.windowSeconds * 1000;

      const pipeline = redis.multi();
      pipeline.zremrangebyscore(key, 0, windowStart); // Remove expired entries
      pipeline.zadd(key, now, `${now}:${Math.random()}`); // Add current request
      pipeline.zcount(key, '-inf', '+inf'); // Count requests in window
      pipeline.expire(key, validConfig.windowSeconds); // Set TTL

      const results = await pipeline.exec();

      // zcount result is at index 2
      const count = (results[2]?.[1] ?? 0) as number;
      const remaining = Math.max(0, validConfig.max - count);
      const resetAt = Math.ceil(
        (now + validConfig.windowSeconds * 1000) / 1000,
      );

      if (count > validConfig.max) {
        return {
          allowed: false,
          limit: validConfig.max,
          remaining: 0,
          resetAt,
          retryAfter: validConfig.windowSeconds,
        };
      }

      return {
        allowed: true,
        limit: validConfig.max,
        remaining,
        resetAt,
      };
    },

    async peek(identifier: string): Promise<RateLimitInfo> {
      const key = buildKey(identifier);
      const now = Date.now();
      const windowStart = now - validConfig.windowSeconds * 1000;

      const pipeline = redis.multi();
      pipeline.zremrangebyscore(key, 0, windowStart);
      pipeline.zcount(key, '-inf', '+inf');

      const results = await pipeline.exec();
      const count = (results[1]?.[1] ?? 0) as number;
      const remaining = Math.max(0, validConfig.max - count);
      const resetAt = Math.ceil(
        (now + validConfig.windowSeconds * 1000) / 1000,
      );

      return {
        allowed: count < validConfig.max,
        limit: validConfig.max,
        remaining,
        resetAt,
      };
    },

    async reset(identifier: string): Promise<void> {
      const key = buildKey(identifier);
      await redis.del(key);
    },
  };
}

// ---------------------------------------------------------------------------
// In-Memory Sliding Window Rate Limiter (for testing / no Redis)
// ---------------------------------------------------------------------------

/**
 * Create an in-memory rate limiter.
 * Suitable for development and testing. Not for production multi-instance.
 */
export function createInMemoryRateLimiter(
  config: RateLimitConfig,
): RateLimiter {
  const validConfig = RateLimitConfigSchema.parse(config);
  const windows = new Map<string, number[]>();

  function cleanWindow(key: string): number[] {
    const now = Date.now();
    const windowStart = now - validConfig.windowSeconds * 1000;
    const entries = windows.get(key) ?? [];
    const cleaned = entries.filter((ts) => ts > windowStart);
    windows.set(key, cleaned);
    return cleaned;
  }

  return {
    async check(identifier: string): Promise<RateLimitInfo> {
      const entries = cleanWindow(identifier);
      const now = Date.now();
      const resetAt = Math.ceil(
        (now + validConfig.windowSeconds * 1000) / 1000,
      );

      entries.push(now);
      windows.set(identifier, entries);

      const count = entries.length;

      if (count > validConfig.max) {
        return {
          allowed: false,
          limit: validConfig.max,
          remaining: 0,
          resetAt,
          retryAfter: validConfig.windowSeconds,
        };
      }

      return {
        allowed: true,
        limit: validConfig.max,
        remaining: validConfig.max - count,
        resetAt,
      };
    },

    async peek(identifier: string): Promise<RateLimitInfo> {
      const entries = cleanWindow(identifier);
      const now = Date.now();
      const resetAt = Math.ceil(
        (now + validConfig.windowSeconds * 1000) / 1000,
      );

      return {
        allowed: entries.length < validConfig.max,
        limit: validConfig.max,
        remaining: Math.max(0, validConfig.max - entries.length),
        resetAt,
      };
    },

    async reset(identifier: string): Promise<void> {
      windows.delete(identifier);
    },
  };
}
