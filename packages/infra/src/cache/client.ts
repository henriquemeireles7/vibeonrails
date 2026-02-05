/**
 * Cache Client
 *
 * Provides a Redis-based caching layer using ioredis.
 * Supports get/set/delete with automatic JSON serialization and TTL.
 *
 * Usage:
 *   import { createCache } from '@aor/infra/cache';
 *
 *   const cache = createCache();
 *   await cache.set('user:123', userData, 3600); // TTL in seconds
 *   const user = await cache.get('user:123');
 */

import Redis from 'ioredis';

export interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  flush(): Promise<void>;
  disconnect(): Promise<void>;
}

/**
 * Create a Redis cache client.
 *
 * @param redisUrl - Redis connection URL (default: REDIS_URL env var)
 * @returns Cache client with get/set/delete operations
 */
export function createCache(redisUrl?: string): CacheClient {
  const url = redisUrl ?? process.env.REDIS_URL;

  if (!url) {
    throw new Error(
      '[AOR] REDIS_URL environment variable is required for caching.\n' +
      '  Fix: Add REDIS_URL to your .env file.\n' +
      '  Example: REDIS_URL=redis://localhost:6379',
    );
  }

  const redis = new Redis(url);

  return {
    async get<T>(key: string): Promise<T | null> {
      const raw = await redis.get(key);
      if (!raw) return null;
      try {
        return JSON.parse(raw) as T;
      } catch {
        return raw as unknown as T;
      }
    },

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await redis.setex(key, ttlSeconds, serialized);
      } else {
        await redis.set(key, serialized);
      }
    },

    async delete(key: string): Promise<void> {
      await redis.del(key);
    },

    async exists(key: string): Promise<boolean> {
      const result = await redis.exists(key);
      return result === 1;
    },

    async flush(): Promise<void> {
      await redis.flushdb();
    },

    async disconnect(): Promise<void> {
      await redis.quit();
    },
  };
}
