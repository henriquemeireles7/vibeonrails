/**
 * Rate Limiting — Types
 *
 * Redis-backed sliding window rate limiter.
 * Per-user and per-endpoint configuration.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const RateLimitConfigSchema = z.object({
  /** Maximum number of requests allowed in the window */
  max: z.number().int().positive(),

  /** Window duration in seconds */
  windowSeconds: z.number().int().positive(),

  /** Key prefix for Redis (default: "rl:") */
  keyPrefix: z.string().default('rl:'),
});

export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

// ---------------------------------------------------------------------------
// Rate Limit Info
// ---------------------------------------------------------------------------

export interface RateLimitInfo {
  /** Whether the request is allowed */
  allowed: boolean;

  /** Maximum requests in the window */
  limit: number;

  /** Remaining requests in the current window */
  remaining: number;

  /** Unix timestamp (seconds) when the window resets */
  resetAt: number;

  /** Retry-After in seconds (only set when rate limited) */
  retryAfter?: number;
}

// ---------------------------------------------------------------------------
// Rate Limiter Interface
// ---------------------------------------------------------------------------

export interface RateLimiter {
  /** Check and consume a rate limit token */
  check(key: string): Promise<RateLimitInfo>;

  /** Get current rate limit status without consuming a token */
  peek(key: string): Promise<RateLimitInfo>;

  /** Reset rate limit for a key */
  reset(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// Standard Rate Limit Headers
// ---------------------------------------------------------------------------

export interface RateLimitHeaders {
  'X-RateLimit-Limit': string;
  'X-RateLimit-Remaining': string;
  'X-RateLimit-Reset': string;
  'Retry-After'?: string;
}

/**
 * Convert rate limit info to standard HTTP headers.
 */
export function toRateLimitHeaders(info: RateLimitInfo): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    'X-RateLimit-Limit': String(info.limit),
    'X-RateLimit-Remaining': String(Math.max(0, info.remaining)),
    'X-RateLimit-Reset': String(info.resetAt),
  };

  if (info.retryAfter !== undefined) {
    headers['Retry-After'] = String(info.retryAfter);
  }

  return headers;
}
