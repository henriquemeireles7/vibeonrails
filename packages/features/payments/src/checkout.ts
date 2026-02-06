import type Stripe from "stripe";

export interface CheckoutOptions {
  priceId: string;
  customerId?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, string>;
}

/**
 * Create a Stripe checkout session for one-time payments.
 */
export async function createCheckout(
  stripe: Stripe,
  options: CheckoutOptions,
): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: options.priceId, quantity: 1 }],
    customer: options.customerId,
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: options.metadata,
  });
}
