import type Stripe from "stripe";
import type { PricingConfig } from "./pricing-config.js";

export interface CreateSubscriptionOptions {
  customerId: string;
  priceId: string;
  trialDays?: number;
  metadata?: Record<string, string>;
  /** Pricing config for server-side price and trial validation */
  pricing?: PricingConfig;
}

/**
 * Create a Stripe subscription.
 *
 * When a PricingConfig is provided, priceId and trialDays are validated
 * server-side against allowed values before being sent to Stripe.
 */
export async function createSubscription(
  stripe: Stripe,
  options: CreateSubscriptionOptions,
): Promise<Stripe.Subscription> {
  if (options.pricing) {
    options.pricing.validatePriceId(options.priceId);
    options.pricing.validateTrialDays(options.priceId, options.trialDays);
  }

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

export interface ChangePlanOptions {
  /** Pricing config for server-side price validation */
  pricing?: PricingConfig;
}

/**
 * Change subscription plan.
 *
 * When a PricingConfig is provided, the new priceId is validated
 * server-side against allowed values before being sent to Stripe.
 */
export async function changePlan(
  stripe: Stripe,
  subscriptionId: string,
  newPriceId: string,
  options?: ChangePlanOptions,
): Promise<Stripe.Subscription> {
  if (options?.pricing) {
    options.pricing.validatePriceId(newPriceId);
  }

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const item = sub.items.data[0];
  if (!item) throw new Error("Subscription has no items");

  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: item.id, price: newPriceId }],
    proration_behavior: "create_prorations",
  });
}
