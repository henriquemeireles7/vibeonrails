import { AIError, type AIErrorCode, type AIProviderName, type RetryConfig, DEFAULT_RETRY_CONFIG } from './types.js';

/**
 * Determines if an error is retryable.
 * Rate limits and transient network errors are retryable.
 * Auth errors, invalid requests, and parse errors are not.
 */
export function isRetryableError(error: AIError): boolean {
  const retryableCodes: AIErrorCode[] = [
    'RATE_LIMIT',
    'PROVIDER_ERROR',
    'NETWORK_ERROR',
    'TIMEOUT',
  ];
  return retryableCodes.includes(error.code);
}

/**
 * Calculate delay for exponential backoff with jitter.
 */
export function calculateDelay(
  attempt: number,
  config: RetryConfig,
): number {
  const exponentialDelay = config.baseDelay * Math.pow(2, attempt);
  const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
  // Add jitter: random value between 0 and cappedDelay
  const jitter = Math.random() * cappedDelay * 0.1;
  return cappedDelay + jitter;
}

/**
 * Execute a function with retry logic and exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  provider: AIProviderName,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<T> {
  let lastError: AIError | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const aiError =
        error instanceof AIError
          ? error
          : new AIError(
              error instanceof Error ? error.message : String(error),
              'PROVIDER_ERROR',
              provider,
              error,
            );

      lastError = aiError;

      if (!isRetryableError(aiError) || attempt === config.maxRetries) {
        throw aiError;
      }

      const delay = calculateDelay(attempt, config);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError;
}
