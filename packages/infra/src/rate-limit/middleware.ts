/**
 * Rate Limiting — Hono Middleware
 *
 * Apply rate limiting to Hono routes. Configurable per-route.
 * Default limits on auth endpoints (5 per 15 minutes).
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import { type RateLimiter, type RateLimitInfo, toRateLimitHeaders } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitMiddlewareOptions {
  /** The rate limiter instance */
  limiter: RateLimiter;

  /** Function to generate the rate limit key from the request */
  keyGenerator?: (c: Context) => string;

  /** Custom response when rate limited */
  onRateLimited?: (c: Context, info: RateLimitInfo) => Response;

  /** Routes to skip rate limiting (e.g., health checks) */
  skipPaths?: string[];
}

// ---------------------------------------------------------------------------
// Default Key Generator
// ---------------------------------------------------------------------------

function defaultKeyGenerator(c: Context): string {
  // Use IP address + path as default key
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
    c.req.header('x-real-ip') ??
    'unknown';
  return `${ip}:${c.req.path}`;
}

// ---------------------------------------------------------------------------
// Middleware Factory
// ---------------------------------------------------------------------------

/**
 * Create rate limiting middleware for Hono.
 *
 * @example
 * ```ts
 * const limiter = createInMemoryRateLimiter({ max: 100, windowSeconds: 60 });
 * app.use('/api/*', createRateLimitMiddleware({ limiter }));
 * ```
 */
export function createRateLimitMiddleware(
  options: RateLimitMiddlewareOptions,
): MiddlewareHandler {
  const {
    limiter,
    keyGenerator = defaultKeyGenerator,
    onRateLimited,
    skipPaths = [],
  } = options;

  return async (c: Context, next: Next) => {
    // Skip configured paths
    if (skipPaths.some((path) => c.req.path.startsWith(path))) {
      await next();
      return;
    }

    const key = keyGenerator(c);
    const info = await limiter.check(key);

    // Set rate limit headers on all responses
    const headers = toRateLimitHeaders(info);
    for (const [name, value] of Object.entries(headers)) {
      c.res.headers.set(name, value);
    }

    if (!info.allowed) {
      if (onRateLimited) {
        return onRateLimited(c, info);
      }

      return c.json(
        {
          error: 'Too many requests',
          code: 'RATE_LIMITED',
          retryAfter: info.retryAfter,
        },
        429,
      );
    }

    await next();

    // Set headers on the actual response too
    for (const [name, value] of Object.entries(headers)) {
      c.res.headers.set(name, value);
    }
  };
}

// ---------------------------------------------------------------------------
// Preset Configs
// ---------------------------------------------------------------------------

/** Default rate limit for auth endpoints: 5 per 15 minutes */
export const AUTH_RATE_LIMIT = {
  max: 5,
  windowSeconds: 15 * 60,
  keyPrefix: 'rl:auth:',
} as const;

/** Default rate limit for API endpoints: 100 per minute */
export const API_RATE_LIMIT = {
  max: 100,
  windowSeconds: 60,
  keyPrefix: 'rl:api:',
} as const;
