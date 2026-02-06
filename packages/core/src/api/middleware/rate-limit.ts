/**
 * Rate Limiting Middleware
 *
 * Simple in-memory rate limiter. For production, use Redis-based rate limiting.
 * Limits requests per IP address within a time window.
 */

import type { MiddlewareHandler } from 'hono';

interface RateLimitOptions {
  /** Maximum requests allowed within the window */
  max: number;
  /** Time window in milliseconds (default: 60000 = 1 minute) */
  windowMs?: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Create a rate-limiting middleware.
 *
 * @param options - Rate limit configuration
 * @returns Hono middleware
 */
export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  const { max, windowMs = 60_000 } = options;
  const store = new Map<string, RateLimitEntry>();

  // Clean up expired entries periodically
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) {
        store.delete(key);
      }
    }
  }, windowMs);

  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown';
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || entry.resetAt <= now) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      c.header('X-RateLimit-Limit', String(max));
      c.header('X-RateLimit-Remaining', String(max - 1));
      await next();
      return;
    }

    entry.count++;

    if (entry.count > max) {
      c.header('X-RateLimit-Limit', String(max));
      c.header('X-RateLimit-Remaining', '0');
      c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json(
        {
          code: 'E6001',
          message: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)} seconds.`,
          docs: 'https://vibeonrails.dev/errors/E6001',
        },
        429,
      );
    }

    c.header('X-RateLimit-Limit', String(max));
    c.header('X-RateLimit-Remaining', String(max - entry.count));
    await next();
  };
}
