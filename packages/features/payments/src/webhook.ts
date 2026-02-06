import type Stripe from "stripe";

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

/**
 * Handle an incoming Stripe webhook event.
 * Verifies the signature and dispatches to registered handlers.
 */
export async function handleWebhook(
  stripe: Stripe,
  body: string | Buffer,
  signature: string,
  webhookSecret: string,
): Promise<{ received: boolean; type: string }> {
  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  const eventHandlers = handlers.get(event.type) ?? [];
  await Promise.all(eventHandlers.map((h) => h(event)));

  return { received: true, type: event.type };
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
