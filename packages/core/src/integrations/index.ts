/**
 * Integrations SDK — Barrel Export
 *
 * Standardized connections to external APIs with
 * retry, rate limiting, error normalization, and health checking.
 */

// Types
export type {
  RetryConfig,
  RateLimitAwareness,
  HealthStatus,
  HealthCheckResult,
  IntegrationConfig,
  Integration,
  IntegrationRequestOptions,
  IntegrationResponse,
} from './types.js';

export {
  IntegrationError,
  RetryConfigSchema,
  RateLimitAwarenessSchema,
} from './types.js';

// SDK
export { defineIntegration } from './sdk.js';

// Shipped integrations
export {
  createTwitterIntegration,
  type TwitterClient,
  type TwitterIntegrationOptions,
  type Tweet,
} from './twitter.js';

export {
  createBlueskyIntegration,
  type BlueskyClient,
  type BlueskyIntegrationOptions,
  type BlueskySession,
  type BlueskyPost,
} from './bluesky.js';
