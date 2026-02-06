import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineIntegration } from './sdk.js';
import { IntegrationError } from './types.js';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function createJsonResponse(
  data: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  const responseHeaders = new Headers({
    'content-type': 'application/json',
    ...headers,
  });
  return new Response(JSON.stringify(data), {
    status,
    headers: responseHeaders,
  });
}

function createErrorResponse(body: string, status: number): Response {
  return new Response(body, { status, headers: { 'content-type': 'text/plain' } });
}

beforeEach(() => {
  mockFetch.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('defineIntegration', () => {
  it('should create an integration with a name', () => {
    const integration = defineIntegration({
      name: 'test-api',
      baseUrl: 'https://api.test.com',
    });
    expect(integration.name).toBe('test-api');
  });

  describe('request', () => {
    it('should make a GET request', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ id: 1, name: 'Test' }),
      );

      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
      });

      const response = await integration.request('/items/1');
      expect(response.data).toEqual({ id: 1, name: 'Test' });
      expect(response.status).toBe(200);
      expect(response.latency).toBeGreaterThanOrEqual(0);
    });

    it('should make a POST request with body', async () => {
      mockFetch.mockResolvedValueOnce(
        createJsonResponse({ id: 2 }, 201),
      );

      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
      });

      await integration.request('/items', {
        method: 'POST',
        body: { name: 'New Item' },
      });

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.test.com/items');
      expect(options.method).toBe('POST');
      expect(options.body).toBe(JSON.stringify({ name: 'New Item' }));
    });

    it('should include default headers', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({}));

      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
        defaultHeaders: { 'X-Custom': 'value' },
      });

      await integration.request('/test');
      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['X-Custom']).toBe('value');
    });

    it('should call authenticate before each request', async () => {
      mockFetch.mockResolvedValueOnce(createJsonResponse({}));

      const authenticate = vi
        .fn()
        .mockResolvedValue({ Authorization: 'Bearer test-token' });

      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
        authenticate,
      });

      await integration.request('/test');
      expect(authenticate).toHaveBeenCalledOnce();

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers.Authorization).toBe('Bearer test-token');
    });
  });

  describe('retry logic', () => {
    it('should retry on 429 status', async () => {
      mockFetch
        .mockResolvedValueOnce(createErrorResponse('Rate limited', 429))
        .mockResolvedValueOnce(createJsonResponse({ ok: true }));

      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
        retry: { maxRetries: 2, baseDelay: 100, jitter: 0 },
      });

      const response = await integration.request('/test');
      expect(response.data).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 status', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createErrorResponse('Service unavailable', 503),
        )
        .mockResolvedValueOnce(createJsonResponse({ ok: true }));

      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
        retry: { maxRetries: 2, baseDelay: 100, jitter: 0 },
      });

      const response = await integration.request('/test');
      expect(response.data).toEqual({ ok: true });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 400 status', async () => {
      mockFetch.mockResolvedValueOnce(
        createErrorResponse('Bad request', 400),
      );

      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
        retry: { maxRetries: 2, baseDelay: 100, jitter: 0 },
      });

      await expect(integration.request('/test')).rejects.toThrow(
        IntegrationError,
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect maxRetries', async () => {
      mockFetch.mockResolvedValue(
        createErrorResponse('Service unavailable', 503),
      );

      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
        retry: { maxRetries: 2, baseDelay: 100, jitter: 0 },
      });

      await expect(integration.request('/test')).rejects.toThrow(
        IntegrationError,
      );
      // 1 initial + 2 retries = 3 total
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should skip retry when skipRetry is true', async () => {
      mockFetch.mockResolvedValueOnce(
        createErrorResponse('Service unavailable', 503),
      );

      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
        retry: { maxRetries: 3, baseDelay: 100, jitter: 0 },
      });

      await expect(
        integration.request('/test', { skipRetry: true }),
      ).rejects.toThrow(IntegrationError);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('error normalization', () => {
    it('should throw IntegrationError for non-OK responses', async () => {
      mockFetch.mockResolvedValueOnce(
        createErrorResponse('Not found', 404),
      );

      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
        retry: { maxRetries: 0 },
      });

      try {
        await integration.request('/missing');
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(IntegrationError);
        const ie = error as IntegrationError;
        expect(ie.integration).toBe('test-api');
        expect(ie.statusCode).toBe(404);
      }
    });

    it('should use custom normalizeError', async () => {
      mockFetch.mockResolvedValueOnce(
        createErrorResponse('Custom error', 422),
      );

      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
        retry: { maxRetries: 0 },
        normalizeError: (error) => {
          return new IntegrationError(
            'Normalized error message',
            'test-api',
            422,
            false,
            error,
          );
        },
      });

      await expect(integration.request('/test')).rejects.toThrow(
        'Normalized error message',
      );
    });
  });

  describe('rate limit awareness', () => {
    it('should track rate limit headers', async () => {
      mockFetch
        .mockResolvedValueOnce(
          createJsonResponse({ page: 1 }, 200, {
            'x-rate-limit-remaining': '100',
            'x-rate-limit-reset': String(
              Math.floor(Date.now() / 1000) + 3600,
            ),
          }),
        )
        .mockResolvedValueOnce(createJsonResponse({ page: 2 }));

      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
      });

      // First request to set rate limit state
      await integration.request('/page/1');
      // Second request should work fine (rate limit is well above threshold)
      const response = await integration.request('/page/2');
      expect(response.data).toEqual({ page: 2 });
    });
  });

  describe('health check', () => {
    it('should return unknown when no health check configured', async () => {
      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
      });

      const health = await integration.checkHealth();
      expect(health.status).toBe('unknown');
      expect(health.message).toBe('No health check configured');
    });

    it('should run custom health check', async () => {
      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
        healthCheck: async () => ({
          status: 'healthy',
          latency: 42,
          lastChecked: new Date(),
        }),
      });

      const health = await integration.checkHealth();
      expect(health.status).toBe('healthy');
      expect(health.latency).toBe(42);
    });

    it('should return unhealthy on health check failure', async () => {
      const integration = defineIntegration({
        name: 'test-api',
        baseUrl: 'https://api.test.com',
        healthCheck: async () => {
          throw new Error('Connection refused');
        },
      });

      const health = await integration.checkHealth();
      expect(health.status).toBe('unhealthy');
      expect(health.message).toBe('Connection refused');
    });
  });

  describe('client factory', () => {
    it('should create typed client via factory', async () => {
      mockFetch.mockResolvedValue(
        createJsonResponse({ id: '123', text: 'Hello' }),
      );

      interface TweetClient {
        postTweet(text: string): Promise<{ id: string; text: string }>;
      }

      const integration = defineIntegration<TweetClient>(
        {
          name: 'twitter',
          baseUrl: 'https://api.twitter.com/2',
        },
        (api) => ({
          async postTweet(text: string) {
            const response = await api.request<{ id: string; text: string }>(
              '/tweets',
              { method: 'POST', body: { text } },
            );
            return response.data;
          },
        }),
      );

      const result = await integration.client.postTweet('Hello world!');
      expect(result).toEqual({ id: '123', text: 'Hello' });
    });
  });
});
