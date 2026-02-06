/**
 * Inbound Webhooks — Types
 *
 * Defines the `defineWebhook()` pattern for receiving webhooks from external services.
 * Handles signature verification, CSRF exclusion, and event logging.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Signature Verification
// ---------------------------------------------------------------------------

export type SignatureAlgorithm = 'hmac-sha256' | 'hmac-sha1' | 'custom';

export const SignatureConfigSchema = z.object({
  /** Header containing the signature */
  header: z.string(),

  /** Algorithm for verification */
  algorithm: z.enum(['hmac-sha256', 'hmac-sha1', 'custom']),

  /** Secret key for HMAC verification */
  secret: z.string().min(1),

  /** Prefix on the signature header value (e.g., "sha256=" for GitHub) */
  prefix: z.string().default(''),

  /** Encoding of the signature (hex or base64) */
  encoding: z.enum(['hex', 'base64']).default('hex'),
});

export type SignatureConfig = z.infer<typeof SignatureConfigSchema>;

// ---------------------------------------------------------------------------
// Webhook Configuration
// ---------------------------------------------------------------------------

export interface WebhookConfig<TPayload = unknown> {
  /** Unique name for this webhook (e.g., "stripe", "github") */
  name: string;

  /** URL path for the webhook endpoint (e.g., "/webhooks/stripe") */
  path: string;

  /** Signature verification config (null = no verification) */
  signature?: SignatureConfig;

  /** Custom signature verification function (for non-standard signatures) */
  verifySignature?: (request: {
    body: string;
    headers: Record<string, string>;
  }) => Promise<boolean>;

  /** Zod schema for payload validation (optional) */
  payloadSchema?: z.ZodType<TPayload>;

  /** Handler function called when webhook is received */
  handler: (event: WebhookEvent<TPayload>) => Promise<void>;

  /** Whether to log webhook events (default: true) */
  logEvents?: boolean;
}

// ---------------------------------------------------------------------------
// Webhook Event
// ---------------------------------------------------------------------------

export interface WebhookEvent<TPayload = unknown> {
  /** Webhook name */
  webhook: string;

  /** Raw request body */
  rawBody: string;

  /** Parsed payload */
  payload: TPayload;

  /** Request headers */
  headers: Record<string, string>;

  /** Timestamp of receipt */
  receivedAt: Date;

  /** Unique event ID (from header or generated) */
  eventId: string;
}

// ---------------------------------------------------------------------------
// Webhook Instance
// ---------------------------------------------------------------------------

export interface Webhook<TPayload = unknown> {
  /** Webhook name */
  readonly name: string;

  /** URL path */
  readonly path: string;

  /** Process an incoming webhook request */
  process(request: {
    body: string;
    headers: Record<string, string>;
  }): Promise<WebhookResult<TPayload>>;
}

export interface WebhookResult<TPayload = unknown> {
  success: boolean;
  eventId: string;
  event?: WebhookEvent<TPayload>;
  error?: string;
}

// ---------------------------------------------------------------------------
// Webhook Registry
// ---------------------------------------------------------------------------

export interface WebhookRegistry {
  /** Register a webhook */
  register<TPayload>(webhook: Webhook<TPayload>): void;

  /** Get a webhook by path */
  getByPath(path: string): Webhook | undefined;

  /** Get all registered webhook paths (for CSRF exclusion) */
  getPaths(): string[];

  /** List all registered webhooks */
  list(): Array<{ name: string; path: string }>;
}
