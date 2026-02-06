/**
 * Integrations SDK — Types
 *
 * Defines the `defineIntegration()` pattern for connecting to external APIs.
 * Each integration gets retry, rate limiting, error normalization, and health checking.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Retry Configuration
// ---------------------------------------------------------------------------

export const RetryConfigSchema = z.object({
  /** Maximum number of retries */
  maxRetries: z.number().int().min(0).max(10).default(3),

  /** Base delay in milliseconds for exponential backoff */
  baseDelay: z.number().int().min(100).default(1000),

  /** Maximum delay in milliseconds */
  maxDelay: z.number().int().min(1000).default(30000),

  /** Jitter factor (0-1). 0 = no jitter, 1 = full jitter */
  jitter: z.number().min(0).max(1).default(0.1),
});

export type RetryConfig = z.infer<typeof RetryConfigSchema>;

// ---------------------------------------------------------------------------
// Rate Limit Configuration
// ---------------------------------------------------------------------------

export const RateLimitAwarenessSchema = z.object({
  /** Header name for remaining requests (e.g., "x-rate-limit-remaining") */
  remainingHeader: z.string().default('x-rate-limit-remaining'),

  /** Header name for reset time (e.g., "x-rate-limit-reset") */
  resetHeader: z.string().default('x-rate-limit-reset'),

  /** Whether reset header is epoch seconds or ISO string */
  resetFormat: z.enum(['epoch', 'iso']).default('epoch'),

  /** Minimum remaining before backing off */
  backoffThreshold: z.number().int().min(0).default(5),
});

export type RateLimitAwareness = z.infer<typeof RateLimitAwarenessSchema>;

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

export interface HealthCheckResult {
  status: HealthStatus;
  latency: number;
  message?: string;
  lastChecked: Date;
}

// ---------------------------------------------------------------------------
// Integration Error
// ---------------------------------------------------------------------------

export class IntegrationError extends Error {
  constructor(
    message: string,
    public readonly integration: string,
    public readonly statusCode?: number,
    public readonly retryable: boolean = false,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

// ---------------------------------------------------------------------------
// Integration Config
// ---------------------------------------------------------------------------

export interface IntegrationConfig<TClient = unknown> {
  /** Unique name for this integration (e.g., "twitter", "stripe") */
  name: string;

  /** Base URL for the API */
  baseUrl: string;

  /** Retry configuration */
  retry?: Partial<RetryConfig>;

  /** Rate limit awareness configuration */
  rateLimit?: Partial<RateLimitAwareness>;

  /** Default headers for all requests */
  defaultHeaders?: Record<string, string>;

  /** Timeout in milliseconds */
  timeout?: number;

  /**
   * Authentication function. Called before each request.
   * Returns headers to add to the request.
   */
  authenticate?: () => Promise<Record<string, string>>;

  /**
   * Health check function. Called by the health check system.
   */
  healthCheck?: (client: TClient) => Promise<HealthCheckResult>;

  /**
   * Error normalizer. Maps external API errors to IntegrationError.
   */
  normalizeError?: (error: unknown) => IntegrationError;
}

// ---------------------------------------------------------------------------
// Integration Instance
// ---------------------------------------------------------------------------

export interface Integration<TClient = unknown> {
  /** Integration name */
  readonly name: string;

  /** The typed API client */
  readonly client: TClient;

  /** Check health of this integration */
  checkHealth(): Promise<HealthCheckResult>;

  /** Make an HTTP request through the integration (with retry + rate limit) */
  request<T = unknown>(
    path: string,
    options?: IntegrationRequestOptions,
  ): Promise<IntegrationResponse<T>>;
}

export interface IntegrationRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  /** Skip retry for this request */
  skipRetry?: boolean;
}

export interface IntegrationResponse<T = unknown> {
  data: T;
  status: number;
  headers: Record<string, string>;
  latency: number;
}
