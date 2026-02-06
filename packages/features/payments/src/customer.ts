import type Stripe from "stripe";

/**
 * Create a Stripe customer.
 */
export async function createCustomer(
  stripe: Stripe,
  data: { email: string; name?: string; metadata?: Record<string, string> },
): Promise<Stripe.Customer> {
  return stripe.customers.create({
    email: data.email,
    name: data.name,
    metadata: data.metadata,
  });
}

/**
 * Get a Stripe customer by ID.
 */
export async function getCustomer(
  stripe: Stripe,
  customerId: string,
): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
  return stripe.customers.retrieve(customerId);
}

/**
 * Create a customer portal session URL.
 */
export async function createPortalSession(
  stripe: Stripe,
  customerId: string,
  returnUrl: string,
): Promise<string> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session.url;
}
