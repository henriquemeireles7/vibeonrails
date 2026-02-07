import type Stripe from "stripe";
import type { PricingConfig } from "./pricing-config.js";

export interface CheckoutOptions {
  priceId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
  /** Pricing config for server-side price validation. When provided, priceId is validated. */
  pricing?: PricingConfig;
}

/**
 * Create a Stripe checkout session for one-time payments.
 *
 * When a PricingConfig is provided, the priceId is validated server-side
 * against the allowed price list before being sent to Stripe. This prevents
 * attackers from submitting arbitrary price IDs via request tampering.
 */
export async function createCheckout(
  stripe: Stripe,
  options: CheckoutOptions,
): Promise<Stripe.Checkout.Session> {
  if (options.pricing) {
    options.pricing.validatePriceId(options.priceId);
  }

  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: options.priceId, quantity: 1 }],
    customer: options.customerId,
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: options.metadata,
  });
}
