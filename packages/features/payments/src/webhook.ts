import type Stripe from "stripe";
import type { WebhookStore } from "./webhook-store.js";

export type WebhookEventType =
  | "checkout.session.completed"
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.payment_succeeded"
  | "invoice.payment_failed";

export type WebhookHandler = (event: Stripe.Event) => void | Promise<void>;

const handlers = new Map<string, WebhookHandler[]>();

/**
 * Register a webhook handler for a specific event type.
 */
export function on(eventType: WebhookEventType, handler: WebhookHandler): void {
  const existing = handlers.get(eventType) ?? [];
  existing.push(handler);
  handlers.set(eventType, existing);
}

export interface HandleWebhookOptions {
  /** Idempotency store to prevent duplicate event processing */
  idempotencyStore?: WebhookStore;
}

/**
 * Handle an incoming Stripe webhook event.
 * Verifies the signature and dispatches to registered handlers.
 *
 * When an idempotencyStore is provided, duplicate events (same event.id)
 * are acknowledged but not re-processed. Stripe explicitly sends duplicate
 * events, so idempotency prevents double-charges, double-account creation, etc.
 */
export async function handleWebhook(
  stripe: Stripe,
  body: string | Buffer,
  signature: string,
  webhookSecret: string,
  options?: HandleWebhookOptions,
): Promise<{ received: boolean; type: string; duplicate: boolean }> {
  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  // Idempotency check: skip if this event was already processed
  if (options?.idempotencyStore) {
    const alreadyProcessed = await options.idempotencyStore.has(event.id);
    if (alreadyProcessed) {
      return { received: true, type: event.type, duplicate: true };
    }
  }

  const eventHandlers = handlers.get(event.type) ?? [];
  await Promise.all(eventHandlers.map((h) => h(event)));

  // Mark event as processed after successful handling
  if (options?.idempotencyStore) {
    await options.idempotencyStore.add(event.id);
  }

  return { received: true, type: event.type, duplicate: false };
}

/**
 * Clear all webhook handlers (for testing).
 */
export function clearWebhookHandlers(): void {
  handlers.clear();
}

/**
 * Get registered handler count for an event type (for testing).
 */
export function getHandlerCount(eventType: string): number {
  return handlers.get(eventType)?.length ?? 0;
}
