import { describe, it, expect, vi } from "vitest";
import { createCheckout } from "./checkout.js";

describe("createCheckout", () => {
  it("calls stripe.checkout.sessions.create with correct params", async () => {
    const mockStripe = {
      checkout: {
        sessions: {
          create: vi.fn().mockResolvedValue({ id: "cs_test_123", url: "https://checkout.stripe.com" }),
        },
      },
    } as never;

    const session = await createCheckout(mockStripe, {
      priceId: "price_123",
      successUrl: "https://example.com/success",
      cancelUrl: "https://example.com/cancel",
    });

    expect(session.id).toBe("cs_test_123");
    expect(mockStripe.checkout.sessions.create).toHaveBeenCalledWith({
      mode: "payment",
      line_items: [{ price: "price_123", quantity: 1 }],
      customer: undefined,
      success_url: "https://example.com/success",
      cancel_url: "https://example.com/cancel",
      metadata: undefined,
    });
  });
});
