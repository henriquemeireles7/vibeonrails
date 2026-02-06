import { describe, it, expect, vi } from 'vitest';
import { createHmac } from 'node:crypto';
import { defineWebhook, createWebhookRegistry } from './handler.js';
import { z } from 'zod';

function signPayload(
  body: string,
  secret: string,
  algorithm: 'sha256' | 'sha1' = 'sha256',
  prefix = '',
): string {
  const sig = createHmac(algorithm, secret)
    .update(body, 'utf8')
    .digest('hex');
  return `${prefix}${sig}`;
}

describe('defineWebhook', () => {
  describe('signature verification', () => {
    it('should verify HMAC-SHA256 signature', async () => {
      const secret = 'webhook-secret-key';
      const body = JSON.stringify({ event: 'test' });
      const handler = vi.fn();

      const webhook = defineWebhook({
        name: 'test',
        path: '/webhooks/test',
        signature: {
          header: 'x-signature',
          algorithm: 'hmac-sha256',
          secret,
          prefix: '',
          encoding: 'hex',
        },
        handler,
      });

      const signature = signPayload(body, secret);
      const result = await webhook.process({
        body,
        headers: { 'x-signature': signature },
      });

      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should reject invalid signature', async () => {
      const webhook = defineWebhook({
        name: 'test',
        path: '/webhooks/test',
        signature: {
          header: 'x-signature',
          algorithm: 'hmac-sha256',
          secret: 'correct-secret',
          prefix: '',
          encoding: 'hex',
        },
        handler: vi.fn(),
      });

      const body = JSON.stringify({ event: 'test' });
      const badSig = signPayload(body, 'wrong-secret');

      const result = await webhook.process({
        body,
        headers: { 'x-signature': badSig },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid signature');
    });

    it('should reject missing signature header', async () => {
      const webhook = defineWebhook({
        name: 'test',
        path: '/webhooks/test',
        signature: {
          header: 'x-signature',
          algorithm: 'hmac-sha256',
          secret: 'secret',
          prefix: '',
          encoding: 'hex',
        },
        handler: vi.fn(),
      });

      const result = await webhook.process({
        body: '{}',
        headers: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing signature header');
    });

    it('should handle GitHub-style signature with prefix', async () => {
      const secret = 'github-secret';
      const body = JSON.stringify({ action: 'opened' });
      const handler = vi.fn();

      const webhook = defineWebhook({
        name: 'github',
        path: '/webhooks/github',
        signature: {
          header: 'x-hub-signature-256',
          algorithm: 'hmac-sha256',
          secret,
          prefix: 'sha256=',
          encoding: 'hex',
        },
        handler,
      });

      const signature = signPayload(body, secret, 'sha256', 'sha256=');
      const result = await webhook.process({
        body,
        headers: { 'x-hub-signature-256': signature },
      });

      expect(result.success).toBe(true);
    });

    it('should support custom verifySignature function', async () => {
      const handler = vi.fn();
      const webhook = defineWebhook({
        name: 'custom',
        path: '/webhooks/custom',
        verifySignature: async ({ headers }) => {
          return headers['x-custom-auth'] === 'valid-token';
        },
        handler,
      });

      const result = await webhook.process({
        body: '{"event":"test"}',
        headers: { 'x-custom-auth': 'valid-token' },
      });

      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('should reject custom verification failure', async () => {
      const webhook = defineWebhook({
        name: 'custom',
        path: '/webhooks/custom',
        verifySignature: async () => false,
        handler: vi.fn(),
      });

      const result = await webhook.process({
        body: '{}',
        headers: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Signature verification failed');
    });
  });

  describe('payload validation', () => {
    it('should validate payload against Zod schema', async () => {
      const schema = z.object({
        type: z.string(),
        data: z.object({ id: z.string() }),
      });
      const handler = vi.fn();

      const webhook = defineWebhook({
        name: 'test',
        path: '/webhooks/test',
        payloadSchema: schema,
        handler,
      });

      const body = JSON.stringify({
        type: 'payment',
        data: { id: '123' },
      });

      const result = await webhook.process({ body, headers: {} });
      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: { type: 'payment', data: { id: '123' } },
        }),
      );
    });

    it('should reject invalid payload', async () => {
      const schema = z.object({ type: z.string() });

      const webhook = defineWebhook({
        name: 'test',
        path: '/webhooks/test',
        payloadSchema: schema,
        handler: vi.fn(),
      });

      const result = await webhook.process({
        body: JSON.stringify({ wrong: 'field' }),
        headers: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Payload validation failed');
    });

    it('should reject invalid JSON', async () => {
      const webhook = defineWebhook({
        name: 'test',
        path: '/webhooks/test',
        handler: vi.fn(),
      });

      const result = await webhook.process({
        body: 'not-json{{{',
        headers: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid JSON payload');
    });
  });

  describe('event processing', () => {
    it('should create webhook event with all fields', async () => {
      const handler = vi.fn();
      const webhook = defineWebhook({
        name: 'stripe',
        path: '/webhooks/stripe',
        handler,
        logEvents: false,
      });

      const body = JSON.stringify({ type: 'payment_intent.succeeded' });
      const result = await webhook.process({
        body,
        headers: { 'x-webhook-id': 'evt_123' },
      });

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('evt_123');
      expect(result.event!.webhook).toBe('stripe');
      expect(result.event!.rawBody).toBe(body);
      expect(result.event!.receivedAt).toBeInstanceOf(Date);
    });

    it('should generate event ID when not in headers', async () => {
      const webhook = defineWebhook({
        name: 'test',
        path: '/webhooks/test',
        handler: vi.fn(),
        logEvents: false,
      });

      const result = await webhook.process({
        body: '{}',
        headers: {},
      });

      expect(result.eventId).toMatch(/^wh_/);
    });

    it('should handle handler errors gracefully', async () => {
      const webhook = defineWebhook({
        name: 'test',
        path: '/webhooks/test',
        handler: async () => {
          throw new Error('Handler exploded');
        },
        logEvents: false,
      });

      const result = await webhook.process({
        body: '{}',
        headers: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Handler exploded');
    });
  });
});

describe('createWebhookRegistry', () => {
  it('should register and retrieve webhooks', () => {
    const registry = createWebhookRegistry();
    const webhook = defineWebhook({
      name: 'stripe',
      path: '/webhooks/stripe',
      handler: vi.fn(),
    });

    registry.register(webhook);

    expect(registry.getByPath('/webhooks/stripe')).toBe(webhook);
    expect(registry.getByPath('/nonexistent')).toBeUndefined();
  });

  it('should list registered webhook paths for CSRF exclusion', () => {
    const registry = createWebhookRegistry();

    registry.register(
      defineWebhook({
        name: 'stripe',
        path: '/webhooks/stripe',
        handler: vi.fn(),
      }),
    );
    registry.register(
      defineWebhook({
        name: 'github',
        path: '/webhooks/github',
        handler: vi.fn(),
      }),
    );

    const paths = registry.getPaths();
    expect(paths).toContain('/webhooks/stripe');
    expect(paths).toContain('/webhooks/github');
    expect(paths).toHaveLength(2);
  });

  it('should list all webhooks with name and path', () => {
    const registry = createWebhookRegistry();
    registry.register(
      defineWebhook({
        name: 'stripe',
        path: '/webhooks/stripe',
        handler: vi.fn(),
      }),
    );

    const list = registry.list();
    expect(list).toEqual([
      { name: 'stripe', path: '/webhooks/stripe' },
    ]);
  });
});
