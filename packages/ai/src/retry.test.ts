import { describe, it, expect, vi } from 'vitest';
import { isRetryableError, calculateDelay, withRetry } from './retry.js';
import { AIError, DEFAULT_RETRY_CONFIG } from './types.js';

describe('retry utilities', () => {
  describe('isRetryableError', () => {
    it('should return true for retryable errors', () => {
      expect(
        isRetryableError(new AIError('rate limited', 'RATE_LIMIT', 'anthropic')),
      ).toBe(true);
      expect(
        isRetryableError(
          new AIError('server error', 'PROVIDER_ERROR', 'openai'),
        ),
      ).toBe(true);
      expect(
        isRetryableError(
          new AIError('network error', 'NETWORK_ERROR', 'ollama'),
        ),
      ).toBe(true);
      expect(
        isRetryableError(new AIError('timeout', 'TIMEOUT', 'anthropic')),
      ).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      expect(
        isRetryableError(new AIError('auth', 'AUTH_ERROR', 'anthropic')),
      ).toBe(false);
      expect(
        isRetryableError(
          new AIError('invalid', 'INVALID_REQUEST', 'openai'),
        ),
      ).toBe(false);
      expect(
        isRetryableError(
          new AIError('not found', 'MODEL_NOT_FOUND', 'ollama'),
        ),
      ).toBe(false);
      expect(
        isRetryableError(new AIError('parse', 'PARSE_ERROR', 'anthropic')),
      ).toBe(false);
      expect(
        isRetryableError(
          new AIError('ctx', 'CONTEXT_LENGTH_EXCEEDED', 'openai'),
        ),
      ).toBe(false);
      expect(
        isRetryableError(
          new AIError('cap', 'CAPABILITY_NOT_SUPPORTED', 'ollama'),
        ),
      ).toBe(false);
    });
  });

  describe('calculateDelay', () => {
    it('should increase delay with each attempt', () => {
      const config = { ...DEFAULT_RETRY_CONFIG };
      const delay0 = calculateDelay(0, config);
      const delay1 = calculateDelay(1, config);
      const delay2 = calculateDelay(2, config);

      // Base delay is 1000, so attempt 0 = ~1000, attempt 1 = ~2000, attempt 2 = ~4000
      // Jitter adds up to 10% extra
      expect(delay0).toBeGreaterThanOrEqual(1000);
      expect(delay0).toBeLessThanOrEqual(1100);
      expect(delay1).toBeGreaterThanOrEqual(2000);
      expect(delay1).toBeLessThanOrEqual(2200);
      expect(delay2).toBeGreaterThanOrEqual(4000);
      expect(delay2).toBeLessThanOrEqual(4400);
    });

    it('should cap delay at maxDelay', () => {
      const config = { maxRetries: 10, baseDelay: 1000, maxDelay: 5000 };
      const delay = calculateDelay(10, config);
      expect(delay).toBeLessThanOrEqual(5500); // maxDelay + 10% jitter
    });
  });

  describe('withRetry', () => {
    it('should return result on first success', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await withRetry(fn, 'anthropic');
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(
          new AIError('rate limited', 'RATE_LIMIT', 'anthropic'),
        )
        .mockResolvedValue('success after retry');

      const result = await withRetry(fn, 'anthropic', {
        maxRetries: 3,
        baseDelay: 10,
        maxDelay: 50,
      });
      expect(result).toBe('success after retry');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValue(
          new AIError('auth failed', 'AUTH_ERROR', 'anthropic'),
        );

      await expect(
        withRetry(fn, 'anthropic', {
          maxRetries: 3,
          baseDelay: 10,
          maxDelay: 50,
        }),
      ).rejects.toThrow('auth failed');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should wrap non-AIError errors', async () => {
      const fn = vi
        .fn()
        .mockRejectedValue(new Error('generic error'));

      await expect(
        withRetry(fn, 'openai', {
          maxRetries: 0,
          baseDelay: 10,
          maxDelay: 50,
        }),
      ).rejects.toMatchObject({
        code: 'PROVIDER_ERROR',
        provider: 'openai',
      });
    });

    it('should exhaust retries and throw last error', async () => {
      const fn = vi
        .fn()
        .mockRejectedValue(
          new AIError('server error', 'PROVIDER_ERROR', 'openai'),
        );

      await expect(
        withRetry(fn, 'openai', {
          maxRetries: 2,
          baseDelay: 10,
          maxDelay: 50,
        }),
      ).rejects.toThrow('server error');
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });
  });
});
