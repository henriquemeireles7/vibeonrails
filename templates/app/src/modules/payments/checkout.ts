// VOR: Pre-wired Stripe checkout for SaaS template
// Add STRIPE_SECRET_KEY to .env -> visit /pricing -> working payment
// Subscription management, customer portal, webhook handling pre-wired

import type Stripe from "stripe";

/**
 * Options for creating a SaaS checkout session.
 * The SaaS template pre-wires subscription mode with all necessary defaults.
 */
export interface SaasCheckoutOptions {
  /** Stripe price ID for the plan */
  priceId: string;
  /** Customer email (for new customers) */
  customerEmail?: string;
  /** Existing Stripe customer ID (for returning customers) */
  customerId?: string;
  /** Internal user ID to track in metadata */
  userId: string;
  /** URL to redirect on success */
  successUrl: string;
  /** URL to redirect on cancel */
  cancelUrl: string;
}

/**
 * Options for subscription checkout with trial support.
 */
export interface SubscriptionCheckoutOptions extends SaasCheckoutOptions {
  /** Number of trial days (0 for no trial) */
  trialDays?: number;
}

/**
 * Webhook handler options for processing Stripe events.
 */
export interface WebhookHandlerOptions {
  body: string | Buffer;
  signature: string;
  webhookSecret: string;
  onCheckoutComplete?: (data: CheckoutCompleteData) => void | Promise<void>;
}

/**
 * Data passed to the onCheckoutComplete callback.
 */
export interface CheckoutCompleteData {
  sessionId: string;
  customerId: string;
  subscriptionId: string;
  userId: string;
  planId: string;
}

/**
 * Customer portal options.
 */
export interface PortalOptions {
  customerId: string;
  returnUrl: string;
}

/**
 * Create a SaaS checkout session.
 * Pre-wired for subscription mode with promotion codes enabled.
 * Zero code needed for basic payments -- just add STRIPE_SECRET_KEY.
 */
export async function createSaasCheckout(
  stripe: Stripe,
  options: SaasCheckoutOptions,
): Promise<{ id: string; url: string | null }> {
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: options.priceId, quantity: 1 }],
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: { userId: options.userId },
    allow_promotion_codes: true,
  };

  if (options.customerId) {
    params.customer = options.customerId;
  } else if (options.customerEmail) {
    params.customer_email = options.customerEmail;
  }

  return stripe.checkout.sessions.create(params);
}

/**
 * Create a subscription checkout with optional trial period.
 */
export async function createSubscriptionCheckout(
  stripe: Stripe,
  options: SubscriptionCheckoutOptions,
): Promise<{ id: string; url: string | null }> {
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: options.priceId, quantity: 1 }],
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
    metadata: { userId: options.userId },
    allow_promotion_codes: true,
  };

  if (options.customerId) {
    params.customer = options.customerId;
  } else if (options.customerEmail) {
    params.customer_email = options.customerEmail;
  }

  if (options.trialDays && options.trialDays > 0) {
    params.subscription_data = {
      trial_period_days: options.trialDays,
    };
  }

  return stripe.checkout.sessions.create(params);
}

/**
 * Handle incoming Stripe webhook events for the SaaS checkout flow.
 * Verifies signature and dispatches to the appropriate callback.
 */
export async function handleCheckoutWebhook(
  stripe: Stripe,
  options: WebhookHandlerOptions,
): Promise<{ received: boolean; type: string }> {
  const event = stripe.webhooks.constructEvent(
    options.body,
    options.signature,
    options.webhookSecret,
  );

  if (
    event.type === "checkout.session.completed" &&
    options.onCheckoutComplete
  ) {
    const session = event.data.object as {
      id: string;
      customer: string;
      subscription: string;
      metadata: Record<string, string>;
    };

    await options.onCheckoutComplete({
      sessionId: session.id,
      customerId: session.customer,
      subscriptionId: session.subscription,
      userId: session.metadata.userId ?? "",
      planId: session.metadata.planId ?? "",
    });
  }

  return { received: true, type: event.type };
}

/**
 * Get the Stripe customer portal URL.
 * Allows customers to manage their subscription, update payment method, etc.
 */
export async function getCustomerPortalUrl(
  stripe: Stripe,
  options: PortalOptions,
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: options.customerId,
    return_url: options.returnUrl,
  });
  return session.url;
}
