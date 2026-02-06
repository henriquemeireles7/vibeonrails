# Feature: Payments

The payments feature provides Stripe integration for checkout sessions, subscriptions, customer management, and webhook handling. It is available in the SaaS project template and can be added to any Vibe on Rails application.

---

## Overview

The payments module handles:

- **Checkout sessions** — One-time and recurring payments
- **Subscriptions** — Plans, upgrades, downgrades, cancellations
- **Customer management** — Link Stripe customers to your users
- **Webhooks** — Process Stripe events (payment success, subscription changes, etc.)

---

## Setup

### Install Dependencies

```bash
pnpm add stripe
```

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Configuration

```typescript
// src/config/payments.config.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

export const PLANS = {
  free: {
    name: "Free",
    priceId: null,
    features: ["5 projects", "1GB storage"],
  },
  pro: {
    name: "Pro",
    priceId: "price_pro_monthly",
    features: ["Unlimited projects", "100GB storage", "Priority support"],
  },
  enterprise: {
    name: "Enterprise",
    priceId: "price_enterprise_monthly",
    features: ["Everything in Pro", "SSO", "Dedicated support"],
  },
} as const;
```

---

## Checkout Sessions

Create a Stripe Checkout session to collect payment.

### Create Checkout

```typescript
// src/modules/billing/billing.service.ts
import { stripe, PLANS } from "../../config/payments.config";

export async function createCheckoutSession(
  userId: string,
  plan: keyof typeof PLANS,
  successUrl: string,
  cancelUrl: string,
) {
  const planConfig = PLANS[plan];
  if (!planConfig.priceId) {
    throw new ValidationError("Cannot create checkout for free plan");
  }

  // Find or create Stripe customer
  const customer = await getOrCreateCustomer(userId);

  const session = await stripe.checkout.sessions.create({
    customer: customer.stripeCustomerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: planConfig.priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      plan,
    },
  });

  return { url: session.url };
}
```

### Controller

```typescript
// src/modules/billing/billing.controller.ts
import { router, protectedProcedure } from "@vibeonrails/core/api";
import { z } from "zod";
import * as billingService from "./billing.service";

export const billingRouter = router({
  createCheckout: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["pro", "enterprise"]),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return billingService.createCheckoutSession(
        ctx.user.id,
        input.plan,
        input.successUrl,
        input.cancelUrl,
      );
    }),

  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    return billingService.getSubscription(ctx.user.id);
  }),

  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    return billingService.cancelSubscription(ctx.user.id);
  }),

  getBillingPortalUrl: protectedProcedure
    .input(z.object({ returnUrl: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      return billingService.createBillingPortalSession(
        ctx.user.id,
        input.returnUrl,
      );
    }),
});
```

---

## Subscriptions

### Get Subscription Status

```typescript
export async function getSubscription(userId: string) {
  const customer = await findCustomer(userId);
  if (!customer?.stripeCustomerId) {
    return { plan: "free", status: "active" };
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customer.stripeCustomerId,
    status: "active",
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    return { plan: "free", status: "active" };
  }

  const subscription = subscriptions.data[0];
  const priceId = subscription.items.data[0].price.id;
  const plan =
    Object.entries(PLANS).find(([, p]) => p.priceId === priceId)?.[0] ?? "free";

  return {
    plan,
    status: subscription.status,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  };
}
```

### Cancel Subscription

```typescript
export async function cancelSubscription(userId: string) {
  const customer = await findCustomer(userId);
  if (!customer?.stripeSubscriptionId) {
    throw new ValidationError("No active subscription");
  }

  await stripe.subscriptions.update(customer.stripeSubscriptionId, {
    cancel_at_period_end: true,
  });

  return { message: "Subscription will cancel at end of billing period" };
}
```

### Billing Portal

Let users manage their subscription, payment methods, and invoices via Stripe's hosted portal:

```typescript
export async function createBillingPortalSession(
  userId: string,
  returnUrl: string,
) {
  const customer = await findCustomer(userId);
  if (!customer?.stripeCustomerId) {
    throw new ValidationError("No billing account found");
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}
```

---

## Customer Management

### Link Users to Stripe

```typescript
export async function getOrCreateCustomer(userId: string) {
  // Check if user already has a Stripe customer
  const existing = await findCustomer(userId);
  if (existing?.stripeCustomerId) return existing;

  // Get user details
  const user = await userRepo.findById(userId);
  if (!user) throw new NotFoundError("User not found");

  // Create Stripe customer
  const stripeCustomer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  });

  // Save the link
  await updateUserBilling(userId, {
    stripeCustomerId: stripeCustomer.id,
  });

  return { stripeCustomerId: stripeCustomer.id };
}
```

---

## Webhooks

Handle Stripe events to keep your database in sync with payment status.

### Webhook Endpoint

```typescript
// src/modules/billing/billing.webhook.ts
import { stripe } from "../../config/payments.config";

export async function handleStripeWebhook(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    throw new ValidationError("Invalid webhook signature");
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object);
      break;

    case "invoice.payment_failed":
      await handlePaymentFailed(event.data.object);
      break;

    default:
      // Unhandled event type — log and ignore
      console.log(`Unhandled Stripe event: ${event.type}`);
  }

  return { received: true };
}
```

### Register Webhook Route

```typescript
// In your server setup
app.post("/webhooks/stripe", async (c) => {
  const result = await handleStripeWebhook(c.req.raw);
  return c.json(result);
});
```

### Webhook Handlers

```typescript
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  await updateUserBilling(userId, {
    stripeSubscriptionId: session.subscription as string,
    plan: session.metadata?.plan ?? "pro",
  });

  await audit({
    type: "subscription.created",
    userId,
    metadata: { plan: session.metadata?.plan },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  if (!userId) return;

  await updateUserBilling(userId, {
    stripeSubscriptionId: null,
    plan: "free",
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  const user = await findUserByStripeCustomerId(customerId);
  if (!user) return;

  // Send email notification
  await sendEmail({
    to: user.email,
    subject: "Payment Failed",
    body: "Your payment could not be processed. Please update your payment method.",
  });
}
```

### Local Testing

Use the Stripe CLI to forward webhooks to your local server:

```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
```

This prints the webhook signing secret — use it as `STRIPE_WEBHOOK_SECRET` in your `.env`.

---

## Database Schema

```typescript
// Add to your schema
export const billingAccounts = pgTable("billing_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id)
    .unique(),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }).unique(),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  plan: varchar("plan", { length: 50 }).notNull().default("free"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

---

## Frontend Integration

### Redirect to Checkout

```typescript
const { mutate: checkout } = trpc.billing.createCheckout.useMutation({
  onSuccess: (data) => {
    window.location.href = data.url;
  },
});

<Button onClick={() => checkout({
  plan: 'pro',
  successUrl: `${window.location.origin}/billing/success`,
  cancelUrl: `${window.location.origin}/billing`,
})}>
  Upgrade to Pro
</Button>
```

### Show Subscription Status

```typescript
const { data: subscription } = trpc.billing.getSubscription.useQuery();

<Card title="Current Plan">
  <p>{subscription?.plan ?? 'Free'}</p>
  {subscription?.cancelAtPeriodEnd && (
    <p>Cancels on {subscription.currentPeriodEnd.toLocaleDateString()}</p>
  )}
</Card>
```
