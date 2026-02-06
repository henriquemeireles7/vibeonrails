import { describe, it, expect } from 'vitest';
import { createInMemoryRateLimiter } from './limiter.js';

describe('InMemoryRateLimiter', () => {
  it('should allow requests within limit', async () => {
    const limiter = createInMemoryRateLimiter({
      max: 5,
      windowSeconds: 60,
      keyPrefix: 'test:',
    });

    const result = await limiter.check('user-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
    expect(result.limit).toBe(5);
  });

  it('should decrement remaining on each check', async () => {
    const limiter = createInMemoryRateLimiter({
      max: 3,
      windowSeconds: 60,
      keyPrefix: 'test:',
    });

    const r1 = await limiter.check('user-1');
    const r2 = await limiter.check('user-1');
    const r3 = await limiter.check('user-1');

    expect(r1.remaining).toBe(2);
    expect(r2.remaining).toBe(1);
    expect(r3.remaining).toBe(0);
  });

  it('should reject requests over limit', async () => {
    const limiter = createInMemoryRateLimiter({
      max: 2,
      windowSeconds: 60,
      keyPrefix: 'test:',
    });

    await limiter.check('user-1');
    await limiter.check('user-1');
    const result = await limiter.check('user-1');

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(60);
  });

  it('should track different keys independently', async () => {
    const limiter = createInMemoryRateLimiter({
      max: 2,
      windowSeconds: 60,
      keyPrefix: 'test:',
    });

    await limiter.check('user-1');
    await limiter.check('user-1');
    const r1 = await limiter.check('user-1');
    const r2 = await limiter.check('user-2');

    expect(r1.allowed).toBe(false);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it('should peek without consuming a token', async () => {
    const limiter = createInMemoryRateLimiter({
      max: 5,
      windowSeconds: 60,
      keyPrefix: 'test:',
    });

    const peek1 = await limiter.peek('user-1');
    const peek2 = await limiter.peek('user-1');

    expect(peek1.remaining).toBe(5);
    expect(peek2.remaining).toBe(5); // No token consumed
  });

  it('should reset rate limit for a key', async () => {
    const limiter = createInMemoryRateLimiter({
      max: 2,
      windowSeconds: 60,
      keyPrefix: 'test:',
    });

    await limiter.check('user-1');
    await limiter.check('user-1');

    await limiter.reset('user-1');

    const result = await limiter.check('user-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it('should include resetAt timestamp', async () => {
    const limiter = createInMemoryRateLimiter({
      max: 5,
      windowSeconds: 60,
      keyPrefix: 'test:',
    });

    const result = await limiter.check('user-1');
    const now = Math.ceil(Date.now() / 1000);
    expect(result.resetAt).toBeGreaterThanOrEqual(now);
    expect(result.resetAt).toBeLessThanOrEqual(now + 61);
  });
});
