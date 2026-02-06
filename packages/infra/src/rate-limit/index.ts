/**
 * Rate Limiting — Barrel Export
 */

export type {
  RateLimitConfig,
  RateLimitInfo,
  RateLimiter,
  RateLimitHeaders,
} from './types.js';

export { RateLimitConfigSchema, toRateLimitHeaders } from './types.js';

export {
  createRedisRateLimiter,
  createInMemoryRateLimiter,
  type RedisLike,
} from './limiter.js';

export {
  createRateLimitMiddleware,
  AUTH_RATE_LIMIT,
  API_RATE_LIMIT,
  type RateLimitMiddlewareOptions,
} from './middleware.js';
