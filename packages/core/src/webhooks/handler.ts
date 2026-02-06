/**
 * Inbound Webhooks — Handler Implementation
 *
 * `defineWebhook()` creates a webhook handler with signature verification,
 * payload validation, and event logging. Registered webhooks are automatically
 * excluded from CSRF protection.
 */

import { createHmac } from 'node:crypto';
import {
  type WebhookConfig,
  type Webhook,
  type WebhookEvent,
  type WebhookResult,
  type WebhookRegistry,
  type SignatureConfig,
} from './types.js';

// ---------------------------------------------------------------------------
// Signature Verification
// ---------------------------------------------------------------------------

function verifyHmacSignature(
  body: string,
  config: SignatureConfig,
  signatureHeader: string,
): boolean {
  const algorithm =
    config.algorithm === 'hmac-sha256' ? 'sha256' : 'sha1';

  const expectedSig = createHmac(algorithm, config.secret)
    .update(body, 'utf8')
    .digest(config.encoding);

  // Remove prefix if present
  const actualSig = config.prefix
    ? signatureHeader.replace(config.prefix, '')
    : signatureHeader;

  // Constant-time comparison
  if (expectedSig.length !== actualSig.length) {
    return false;
  }

  const expected = Buffer.from(expectedSig, 'utf8');
  const actual = Buffer.from(actualSig, 'utf8');

  return timingSafeEqual(expected, actual);
}

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i]! ^ b[i]!;
  }
  return result === 0;
}

// ---------------------------------------------------------------------------
// Define Webhook Factory
// ---------------------------------------------------------------------------

/**
 * Create a webhook handler with signature verification and payload validation.
 *
 * @example
 * ```ts
 * const stripeWebhook = defineWebhook({
 *   name: 'stripe',
 *   path: '/webhooks/stripe',
 *   signature: {
 *     header: 'stripe-signature',
 *     algorithm: 'hmac-sha256',
 *     secret: process.env.STRIPE_WEBHOOK_SECRET!,
 *   },
 *   handler: async (event) => {
 *     const payload = event.payload as Record<string, unknown>;
 *     // Handle the event
 *   },
 * });
 * ```
 */
export function defineWebhook<TPayload = unknown>(
  config: WebhookConfig<TPayload>,
): Webhook<TPayload> {
  const logEvents = config.logEvents ?? true;

  return {
    name: config.name,
    path: config.path,

    async process(request: {
      body: string;
      headers: Record<string, string>;
    }): Promise<WebhookResult<TPayload>> {
      const eventId = generateEventId(request.headers);

      try {
        // 1. Verify signature
        if (config.verifySignature) {
          const valid = await config.verifySignature(request);
          if (!valid) {
            return {
              success: false,
              eventId,
              error: `Signature verification failed for webhook: ${config.name}`,
            };
          }
        } else if (config.signature) {
          const sigHeader =
            request.headers[config.signature.header.toLowerCase()];
          if (!sigHeader) {
            return {
              success: false,
              eventId,
              error: `Missing signature header: ${config.signature.header}`,
            };
          }

          const valid = verifyHmacSignature(
            request.body,
            config.signature,
            sigHeader,
          );
          if (!valid) {
            return {
              success: false,
              eventId,
              error: `Invalid signature for webhook: ${config.name}`,
            };
          }
        }

        // 2. Parse and validate payload
        let payload: TPayload;
        try {
          const parsed = JSON.parse(request.body);
          if (config.payloadSchema) {
            const result = config.payloadSchema.safeParse(parsed);
            if (!result.success) {
              return {
                success: false,
                eventId,
                error: `Payload validation failed: ${result.error.message}`,
              };
            }
            payload = result.data;
          } else {
            payload = parsed as TPayload;
          }
        } catch {
          return {
            success: false,
            eventId,
            error: 'Invalid JSON payload',
          };
        }

        // 3. Create event
        const event: WebhookEvent<TPayload> = {
          webhook: config.name,
          rawBody: request.body,
          payload,
          headers: request.headers,
          receivedAt: new Date(),
          eventId,
        };

        // 4. Log event
        if (logEvents) {
          logWebhookEvent(event);
        }

        // 5. Call handler
        await config.handler(event);

        return {
          success: true,
          eventId,
          event,
        };
      } catch (error) {
        return {
          success: false,
          eventId,
          error:
            error instanceof Error
              ? error.message
              : 'Unknown webhook processing error',
        };
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Webhook Registry
// ---------------------------------------------------------------------------

/**
 * Create a webhook registry for managing multiple webhooks.
 */
export function createWebhookRegistry(): WebhookRegistry {
  const webhooks = new Map<string, Webhook>();

  return {
    register<TPayload>(webhook: Webhook<TPayload>): void {
      webhooks.set(webhook.path, webhook as Webhook);
    },

    getByPath(path: string): Webhook | undefined {
      return webhooks.get(path);
    },

    getPaths(): string[] {
      return Array.from(webhooks.keys());
    },

    list(): Array<{ name: string; path: string }> {
      return Array.from(webhooks.values()).map((w) => ({
        name: w.name,
        path: w.path,
      }));
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateEventId(headers: Record<string, string>): string {
  // Try common event ID headers
  const idHeaders = [
    'x-webhook-id',
    'x-request-id',
    'x-github-delivery',
    'stripe-event-id',
  ];

  for (const header of idHeaders) {
    const value = headers[header.toLowerCase()];
    if (value) {
      return value;
    }
  }

  // Generate a random ID
  return `wh_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

function logWebhookEvent(event: WebhookEvent): void {
  // In development, log the event. In production, this would go to structured logging.
  if (process.env.NODE_ENV === 'development') {
    console.log(
      `[webhook] ${event.webhook} event=${event.eventId} received`,
    );
  }
}
