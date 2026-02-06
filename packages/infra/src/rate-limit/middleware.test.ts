import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { createRateLimitMiddleware, AUTH_RATE_LIMIT, API_RATE_LIMIT } from './middleware.js';
import { createInMemoryRateLimiter } from './limiter.js';

describe('Rate Limit Middleware', () => {
  it('should allow requests within limit and set headers', async () => {
    const limiter = createInMemoryRateLimiter({
      max: 5,
      windowSeconds: 60,
      keyPrefix: 'test:',
    });

    const app = new Hono();
    app.use('*', createRateLimitMiddleware({ limiter }));
    app.get('/test', (c) => c.json({ ok: true }));

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('5');
    expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
    expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
  });

  it('should reject requests over limit with 429', async () => {
    const limiter = createInMemoryRateLimiter({
      max: 2,
      windowSeconds: 60,
      keyPrefix: 'test:',
    });

    const app = new Hono();
    app.use('*', createRateLimitMiddleware({ limiter }));
    app.get('/test', (c) => c.json({ ok: true }));

    await app.request('/test');
    await app.request('/test');
    const res = await app.request('/test');

    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('RATE_LIMITED');
    expect(body.retryAfter).toBe(60);
  });

  it('should skip configured paths', async () => {
    const limiter = createInMemoryRateLimiter({
      max: 1,
      windowSeconds: 60,
      keyPrefix: 'test:',
    });

    const app = new Hono();
    app.use(
      '*',
      createRateLimitMiddleware({
        limiter,
        skipPaths: ['/health'],
      }),
    );
    app.get('/health', (c) => c.json({ status: 'ok' }));
    app.get('/api', (c) => c.json({ ok: true }));

    // First API request uses the one allowed
    await app.request('/api');
    // Second API request should be rate limited
    const apiRes = await app.request('/api');
    expect(apiRes.status).toBe(429);

    // Health should always work
    const healthRes = await app.request('/health');
    expect(healthRes.status).toBe(200);
  });

  it('should use custom key generator', async () => {
    const limiter = createInMemoryRateLimiter({
      max: 1,
      windowSeconds: 60,
      keyPrefix: 'test:',
    });

    const app = new Hono();
    app.use(
      '*',
      createRateLimitMiddleware({
        limiter,
        keyGenerator: (c) => c.req.header('X-User-Id') ?? 'anonymous',
      }),
    );
    app.get('/test', (c) => c.json({ ok: true }));

    // User 1 exhausts their limit
    await app.request('/test', {
      headers: { 'X-User-Id': 'user-1' },
    });
    const res1 = await app.request('/test', {
      headers: { 'X-User-Id': 'user-1' },
    });
    expect(res1.status).toBe(429);

    // User 2 should still work
    const res2 = await app.request('/test', {
      headers: { 'X-User-Id': 'user-2' },
    });
    expect(res2.status).toBe(200);
  });

  it('should export preset configs', () => {
    expect(AUTH_RATE_LIMIT.max).toBe(5);
    expect(AUTH_RATE_LIMIT.windowSeconds).toBe(900);
    expect(API_RATE_LIMIT.max).toBe(100);
    expect(API_RATE_LIMIT.windowSeconds).toBe(60);
  });
});
