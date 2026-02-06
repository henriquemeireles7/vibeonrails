/**
 * Inbound Webhooks — Barrel Export
 *
 * Receive and verify webhooks from external services.
 */

export type {
  SignatureAlgorithm,
  SignatureConfig,
  WebhookConfig,
  Webhook,
  WebhookEvent,
  WebhookResult,
  WebhookRegistry,
} from './types.js';

export { SignatureConfigSchema } from './types.js';

export { defineWebhook, createWebhookRegistry } from './handler.js';
