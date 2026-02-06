import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createAPIKeyMiddleware } from './middleware.js';
import {
  createAPIKeyService,
  createInMemoryKeyStore,
} from './service.js';
import type { APIKeyService } from './types.js';

let service: APIKeyService;
let validKey: string;

beforeEach(async () => {
  const store = createInMemoryKeyStore();
  service = createAPIKeyService(store);

  const result = await service.create({
    name: 'Test Key',
    environment: 'live',
    ownerId: 'user-1',
    rateLimit: null,
    expiresAt: null,
    scopes: ['read', 'write'],
    metadata: {},
  });
  validKey = result.key;
});

function createApp(options?: Parameters<typeof createAPIKeyMiddleware>[0]) {
  const app = new Hono();
  const middleware = createAPIKeyMiddleware(
    options ?? { service },
  );

  app.use('/api/*', middleware);
  app.get('/api/test', (c) => c.json({ ok: true }));
  app.get('/public', (c) => c.json({ public: true }));

  return app;
}

describe('API Key Middleware', () => {
  it('should allow requests with valid key in X-API-Key header', async () => {
    const app = createApp();
    const res = await app.request('/api/test', {
      headers: { 'X-API-Key': validKey },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it('should allow requests with valid key in Authorization Bearer header', async () => {
    const app = createApp();
    const res = await app.request('/api/test', {
      headers: { Authorization: `Bearer ${validKey}` },
    });
    expect(res.status).toBe(200);
  });

  it('should reject requests without API key', async () => {
    const app = createApp();
    const res = await app.request('/api/test');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('API_KEY_MISSING');
  });

  it('should reject requests with invalid API key', async () => {
    const app = createApp();
    const res = await app.request('/api/test', {
      headers: { 'X-API-Key': 'vor_live_invalid_key_that_doesnt_exist' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('API_KEY_INVALID');
  });

  it('should reject revoked keys', async () => {
    const result = await service.create({
      name: 'Revoked Key',
      environment: 'live',
      ownerId: 'user-1',
      rateLimit: null,
      expiresAt: null,
      scopes: [],
      metadata: {},
    });
    await service.revoke(result.apiKey.id);

    const app = createApp();
    const res = await app.request('/api/test', {
      headers: { 'X-API-Key': result.key },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('API_KEY_REVOKED');
  });

  it('should reject expired keys', async () => {
    const result = await service.create({
      name: 'Expired Key',
      environment: 'live',
      ownerId: 'user-1',
      rateLimit: null,
      expiresAt: new Date('2020-01-01'),
      scopes: [],
      metadata: {},
    });

    const app = createApp();
    const res = await app.request('/api/test', {
      headers: { 'X-API-Key': result.key },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('API_KEY_EXPIRED');
  });

  it('should not apply to non-matching routes', async () => {
    const app = createApp();
    const res = await app.request('/public');
    expect(res.status).toBe(200);
  });

  describe('scope checking', () => {
    it('should allow key with required scopes', async () => {
      const app = new Hono();
      app.use(
        '/api/*',
        createAPIKeyMiddleware({ service, requiredScopes: ['read'] }),
      );
      app.get('/api/test', (c) => c.json({ ok: true }));

      const res = await app.request('/api/test', {
        headers: { 'X-API-Key': validKey },
      });
      expect(res.status).toBe(200);
    });

    it('should reject key without required scopes', async () => {
      const result = await service.create({
        name: 'Limited Key',
        environment: 'live',
        ownerId: 'user-1',
        rateLimit: null,
        expiresAt: null,
        scopes: ['read'],
        metadata: {},
      });

      const app = new Hono();
      app.use(
        '/api/*',
        createAPIKeyMiddleware({
          service,
          requiredScopes: ['read', 'admin'],
        }),
      );
      app.get('/api/test', (c) => c.json({ ok: true }));

      const res = await app.request('/api/test', {
        headers: { 'X-API-Key': result.key },
      });
      expect(res.status).toBe(403);
    });
  });
});
