/**
 * Integrations SDK — Core Implementation
 *
 * `defineIntegration()` creates a standardized connection to an external API
 * with automatic retry, rate limiting awareness, error normalization, and health checking.
 */

import {
  type IntegrationConfig,
  type Integration,
  type IntegrationRequestOptions,
  type IntegrationResponse,
  type HealthCheckResult,
  type RetryConfig,
  type RateLimitAwareness,
  IntegrationError,
  RetryConfigSchema,
  RateLimitAwarenessSchema,
} from './types.js';

// ---------------------------------------------------------------------------
// Retry Logic
// ---------------------------------------------------------------------------

function calculateDelay(
  attempt: number,
  config: RetryConfig,
): number {
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  const delay = Math.min(exponentialDelay, config.maxDelay);
  const jitter = delay * config.jitter * Math.random();
  return delay + jitter;
}

function isRetryableStatusCode(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof IntegrationError) {
    return error.retryable;
  }
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true; // Network errors are retryable
  }
  return false;
}

// ---------------------------------------------------------------------------
// Rate Limit Tracking
// ---------------------------------------------------------------------------

interface RateLimitState {
  remaining: number | null;
  resetAt: Date | null;
}

function parseRateLimitHeaders(
  headers: Record<string, string>,
  config: RateLimitAwareness,
): Partial<RateLimitState> {
  const state: Partial<RateLimitState> = {};

  const remaining = headers[config.remainingHeader.toLowerCase()];
  if (remaining !== undefined) {
    state.remaining = parseInt(remaining, 10);
  }

  const reset = headers[config.resetHeader.toLowerCase()];
  if (reset !== undefined) {
    if (config.resetFormat === 'epoch') {
      state.resetAt = new Date(parseInt(reset, 10) * 1000);
    } else {
      state.resetAt = new Date(reset);
    }
  }

  return state;
}

// ---------------------------------------------------------------------------
// Define Integration Factory
// ---------------------------------------------------------------------------

/**
 * Create an integration instance with retry, rate limiting, and health checking.
 *
 * @example
 * ```ts
 * const twitter = defineIntegration({
 *   name: 'twitter',
 *   baseUrl: 'https://api.twitter.com/2',
 *   authenticate: async () => ({ Authorization: `Bearer ${token}` }),
 *   retry: { maxRetries: 3 },
 * });
 *
 * const response = await twitter.request('/tweets', {
 *   method: 'POST',
 *   body: { text: 'Hello world!' },
 * });
 * ```
 */
export function defineIntegration<TClient = Record<string, never>>(
  config: IntegrationConfig<TClient>,
  clientFactory?: (integration: {
    request: <T>(
      path: string,
      options?: IntegrationRequestOptions,
    ) => Promise<IntegrationResponse<T>>;
  }) => TClient,
): Integration<TClient> {
  const retryConfig = RetryConfigSchema.parse(config.retry ?? {});
  const rateLimitConfig = RateLimitAwarenessSchema.parse(
    config.rateLimit ?? {},
  );
  const timeout = config.timeout ?? 30000;

  const rateLimitState: RateLimitState = {
    remaining: null,
    resetAt: null,
  };

  // Build the request function
  async function makeRequest<T>(
    path: string,
    options: IntegrationRequestOptions = {},
  ): Promise<IntegrationResponse<T>> {
    const method = options.method ?? 'GET';
    const url = `${config.baseUrl}${path}`;
    const requestTimeout = options.timeout ?? timeout;
    const maxRetries = options.skipRetry ? 0 : retryConfig.maxRetries;

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      // Check rate limit state
      if (
        rateLimitState.remaining !== null &&
        rateLimitState.remaining <= rateLimitConfig.backoffThreshold &&
        rateLimitState.resetAt
      ) {
        const waitMs = rateLimitState.resetAt.getTime() - Date.now();
        if (waitMs > 0 && waitMs < 60000) {
          await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
      }

      // Wait for retry delay (skip on first attempt)
      if (attempt > 0) {
        const delay = calculateDelay(attempt - 1, retryConfig);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      const start = Date.now();

      try {
        // Build headers
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...config.defaultHeaders,
          ...options.headers,
        };

        // Authenticate
        if (config.authenticate) {
          const authHeaders = await config.authenticate();
          Object.assign(headers, authHeaders);
        }

        // Make the request
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          requestTimeout,
        );

        const fetchOptions: RequestInit = {
          method,
          headers,
          signal: controller.signal,
        };

        if (options.body !== undefined && method !== 'GET') {
          fetchOptions.body = JSON.stringify(options.body);
        }

        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);

        const latency = Date.now() - start;

        // Extract response headers
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key.toLowerCase()] = value;
        });

        // Update rate limit state
        const rlUpdate = parseRateLimitHeaders(
          responseHeaders,
          rateLimitConfig,
        );
        if (rlUpdate.remaining !== undefined) {
          rateLimitState.remaining = rlUpdate.remaining;
        }
        if (rlUpdate.resetAt !== undefined) {
          rateLimitState.resetAt = rlUpdate.resetAt;
        }

        // Handle errors
        if (!response.ok) {
          const bodyText = await response.text();

          if (
            isRetryableStatusCode(response.status) &&
            attempt < maxRetries
          ) {
            lastError = new IntegrationError(
              `${config.name} API error: ${response.status} ${bodyText}`,
              config.name,
              response.status,
              true,
            );
            continue;
          }

          // Normalize the error
          if (config.normalizeError) {
            throw config.normalizeError(
              new IntegrationError(
                bodyText,
                config.name,
                response.status,
                false,
              ),
            );
          }

          throw new IntegrationError(
            `${config.name} API error: ${response.status} ${bodyText}`,
            config.name,
            response.status,
            false,
          );
        }

        // Parse response
        const contentType = responseHeaders['content-type'] ?? '';
        let data: T;
        if (contentType.includes('application/json')) {
          data = (await response.json()) as T;
        } else {
          data = (await response.text()) as unknown as T;
        }

        return {
          data,
          status: response.status,
          headers: responseHeaders,
          latency,
        };
      } catch (error) {
        if (error instanceof IntegrationError && !error.retryable) {
          throw error;
        }

        lastError = error;

        if (
          attempt < maxRetries &&
          (isRetryableError(error) || !(error instanceof IntegrationError))
        ) {
          continue;
        }

        // Final attempt failed
        if (config.normalizeError && !(error instanceof IntegrationError)) {
          throw config.normalizeError(error);
        }

        if (error instanceof IntegrationError) {
          throw error;
        }

        throw new IntegrationError(
          `${config.name} request failed: ${error instanceof Error ? error.message : String(error)}`,
          config.name,
          undefined,
          false,
          error,
        );
      }
    }

    // Should not reach here, but just in case
    throw lastError instanceof IntegrationError
      ? lastError
      : new IntegrationError(
          `${config.name} request failed after ${retryConfig.maxRetries} retries`,
          config.name,
          undefined,
          false,
          lastError,
        );
  }

  // Build client
  const requestHelper = { request: makeRequest };
  const client = clientFactory
    ? clientFactory(requestHelper)
    : ({} as TClient);

  return {
    name: config.name,
    client,

    async checkHealth(): Promise<HealthCheckResult> {
      if (!config.healthCheck) {
        return {
          status: 'unknown',
          latency: 0,
          message: 'No health check configured',
          lastChecked: new Date(),
        };
      }

      try {
        return await config.healthCheck(client);
      } catch (error) {
        return {
          status: 'unhealthy',
          latency: 0,
          message:
            error instanceof Error ? error.message : String(error),
          lastChecked: new Date(),
        };
      }
    },

    request: makeRequest,
  };
}
