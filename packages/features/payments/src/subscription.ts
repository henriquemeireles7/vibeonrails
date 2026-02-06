import type Stripe from "stripe";

export interface CreateSubscriptionOptions {
  customerId: string;
  priceId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

/**
 * Create a Stripe subscription.
 */
export async function createSubscription(
  stripe: Stripe,
  options: CreateSubscriptionOptions,
): Promise<Stripe.Subscription> {
  return stripe.subscriptions.create({
    customer: options.customerId,
    items: [{ price: options.priceId }],
    trial_period_days: options.trialDays,
    metadata: options.metadata,
  });
}

/**
 * Cancel a Stripe subscription.
 */
export async function cancelSubscription(
  stripe: Stripe,
  subscriptionId: string,
  immediately = false,
): Promise<Stripe.Subscription> {
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Change subscription plan.
 */
export async function changePlan(
  stripe: Stripe,
  subscriptionId: string,
  newPriceId: string,
): Promise<Stripe.Subscription> {
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const item = sub.items.data[0];
  if (!item) throw new Error("Subscription has no items");

  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: item.id, price: newPriceId }],
    proration_behavior: "create_prorations",
  });
}
