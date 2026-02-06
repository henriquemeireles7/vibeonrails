# @vibeonrails/payments Skill

## Purpose

Stripe payments integration for Vibe on Rails. Provides checkout, subscriptions, customer management, and webhook handling.

## Structure

```
packages/features/payments/
├── src/
│   ├── checkout.ts        # One-time payment checkout sessions
│   ├── subscription.ts    # Subscription management (create, cancel, change plan)
│   ├── customer.ts        # Customer CRUD and billing portal
│   ├── webhook.ts         # Webhook event handler registry
│   └── index.ts           # Barrel export
├── SKILL.md
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Usage

```typescript
import Stripe from "stripe";
import { createCheckout, on, handleWebhook } from "@vibeonrails/payments";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Create checkout
const session = await createCheckout(stripe, {
  priceId: "price_123",
  successUrl: "https://example.com/success",
  cancelUrl: "https://example.com/cancel",
});

// Register webhook handler
on("checkout.session.completed", async (event) => {
  console.log("Payment completed!", event.data.object);
});
```

## Patterns

- All functions take a `Stripe` instance as the first argument (dependency injection)
- Webhook handlers are registered with `on()` and dispatched by `handleWebhook()`
- Use `createPortalSession()` for self-service billing management
