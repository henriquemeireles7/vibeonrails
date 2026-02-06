import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSaasCheckout,
  createSubscriptionCheckout,
  handleCheckoutWebhook,
  getCustomerPortalUrl,
  type SaasCheckoutOptions,
} from "./checkout.js";

// VOR: Mock Stripe client factory for SaaS template tests
function createMockStripe() {
  return {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/pay/cs_test_123",
        }),
      },
    },
    subscriptions: {
      create: vi.fn().mockResolvedValue({
        id: "sub_test_123",
        status: "active",
      }),
      retrieve: vi.fn().mockResolvedValue({
        id: "sub_test_123",
        status: "active",
        items: { data: [{ id: "si_test_1", price: { id: "price_pro" } }] },
      }),
    },
    customers: {
      create: vi.fn().mockResolvedValue({
        id: "cus_test_123",
        email: "user@example.com",
      }),
      retrieve: vi.fn().mockResolvedValue({
        id: "cus_test_123",
        email: "user@example.com",
      }),
    },
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          url: "https://billing.stripe.com/session/test",
        }),
      },
    },
    webhooks: {
      constructEvent: vi.fn().mockReturnValue({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_test_123",
            customer: "cus_test_123",
            subscription: "sub_test_123",
            metadata: { userId: "user_1", planId: "pro" },
          },
        },
      }),
    },
  } as never;
}

describe("SaaS Template Checkout", () => {
  let mockStripe: ReturnType<typeof createMockStripe>;

  beforeEach(() => {
    mockStripe = createMockStripe();
  });

  describe("createSaasCheckout", () => {
    it("creates a subscription checkout session with correct params", async () => {
      const options: SaasCheckoutOptions = {
        priceId: "price_pro_monthly",
        customerEmail: "user@example.com",
        userId: "user_1",
        successUrl: "https://myapp.com/dashboard?checkout=success",
        cancelUrl: "https://myapp.com/pricing",
      };

      const session = await createSaasCheckout(mockStripe as never, options);

      expect(session.id).toBe("cs_test_123");
      expect(session.url).toBe("https://checkout.stripe.com/pay/cs_test_123");
      expect(
        (
          mockStripe as Record<string, unknown> & {
            checkout: { sessions: { create: ReturnType<typeof vi.fn> } };
          }
        ).checkout.sessions.create,
      ).toHaveBeenCalledWith({
        mode: "subscription",
        line_items: [{ price: "price_pro_monthly", quantity: 1 }],
        customer_email: "user@example.com",
        success_url: "https://myapp.com/dashboard?checkout=success",
        cancel_url: "https://myapp.com/pricing",
        metadata: { userId: "user_1" },
        allow_promotion_codes: true,
      });
    });

    it("includes existing customerId when provided", async () => {
      const options: SaasCheckoutOptions = {
        priceId: "price_pro_monthly",
        customerId: "cus_existing_123",
        userId: "user_1",
        successUrl: "https://myapp.com/success",
        cancelUrl: "https://myapp.com/cancel",
      };

      await createSaasCheckout(mockStripe as never, options);

      const createCall = (
        mockStripe as Record<string, unknown> & {
          checkout: { sessions: { create: ReturnType<typeof vi.fn> } };
        }
      ).checkout.sessions.create;
      expect(createCall).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_existing_123",
        }),
      );
    });
  });

  describe("createSubscriptionCheckout", () => {
    it("creates a checkout session for subscription mode", async () => {
      const session = await createSubscriptionCheckout(mockStripe as never, {
        priceId: "price_starter",
        customerEmail: "new@example.com",
        userId: "user_2",
        trialDays: 14,
        successUrl: "https://myapp.com/success",
        cancelUrl: "https://myapp.com/cancel",
      });

      expect(session.id).toBe("cs_test_123");
      const createCall = (
        mockStripe as Record<string, unknown> & {
          checkout: { sessions: { create: ReturnType<typeof vi.fn> } };
        }
      ).checkout.sessions.create;
      expect(createCall).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "subscription",
          subscription_data: {
            trial_period_days: 14,
          },
        }),
      );
    });
  });

  describe("handleCheckoutWebhook", () => {
    it("processes checkout.session.completed event", async () => {
      const onCheckoutComplete = vi.fn();

      const result = await handleCheckoutWebhook(mockStripe as never, {
        body: "raw_body",
        signature: "sig_test",
        webhookSecret: "whsec_test",
        onCheckoutComplete,
      });

      expect(result.received).toBe(true);
      expect(result.type).toBe("checkout.session.completed");
      expect(onCheckoutComplete).toHaveBeenCalledWith({
        sessionId: "cs_test_123",
        customerId: "cus_test_123",
        subscriptionId: "sub_test_123",
        userId: "user_1",
        planId: "pro",
      });
    });

    it("returns received false for unhandled event types", async () => {
      const stripe = createMockStripe();
      (
        stripe as Record<string, unknown> & {
          webhooks: { constructEvent: ReturnType<typeof vi.fn> };
        }
      ).webhooks.constructEvent.mockReturnValue({
        type: "invoice.payment_succeeded",
        data: { object: {} },
      });

      const result = await handleCheckoutWebhook(stripe as never, {
        body: "raw_body",
        signature: "sig_test",
        webhookSecret: "whsec_test",
      });

      expect(result.received).toBe(true);
      expect(result.type).toBe("invoice.payment_succeeded");
    });
  });

  describe("getCustomerPortalUrl", () => {
    it("returns portal URL for existing customer", async () => {
      const url = await getCustomerPortalUrl(mockStripe as never, {
        customerId: "cus_test_123",
        returnUrl: "https://myapp.com/settings",
      });

      expect(url).toBe("https://billing.stripe.com/session/test");
      const createCall = (
        mockStripe as Record<string, unknown> & {
          billingPortal: { sessions: { create: ReturnType<typeof vi.fn> } };
        }
      ).billingPortal.sessions.create;
      expect(createCall).toHaveBeenCalledWith({
        customer: "cus_test_123",
        return_url: "https://myapp.com/settings",
      });
    });
  });
});
