import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import {
  x402PaymentMiddleware,
  type X402MiddlewareOptions,
} from "./middleware.js";

// VOR: x402 middleware tests - payment validation, 402 response, settlement

function createTestApp(options: X402MiddlewareOptions) {
  const app = new Hono();

  app.use("/api/paid/*", x402PaymentMiddleware(options));

  app.get("/api/paid/generate", (c) => {
    return c.json({ result: "generated content" });
  });

  app.get("/api/free/health", (c) => {
    return c.json({ status: "ok" });
  });

  return app;
}

describe("x402 Payment Middleware", () => {
  const defaultOptions: X402MiddlewareOptions = {
    price: "$0.01",
    description: "AI generation endpoint",
  };

  it("returns 402 when no payment header is provided", async () => {
    const app = createTestApp(defaultOptions);

    const res = await app.request("/api/paid/generate");

    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toBe("Payment Required");
    expect(body.payment.price).toBe("$0.01");
    expect(body.payment.currency).toBe("USDC");
    expect(body.payment.network).toBe("base");
  });

  it("includes payment instructions in 402 response", async () => {
    const app = createTestApp(defaultOptions);

    const res = await app.request("/api/paid/generate");
    const body = await res.json();

    expect(body.payment.headerFormat).toContain("x402 token=");
    expect(body.payment.endpoint).toBe("/api/paid/generate");
    expect(body.payment.description).toBe("AI generation endpoint");
  });

  it("passes request through on valid payment", async () => {
    const app = createTestApp(defaultOptions);

    const res = await app.request("/api/paid/generate", {
      headers: {
        "X-Payment":
          "x402 token=pay_valid_123;amount=1;currency=USDC;network=base",
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result).toBe("generated content");
  });

  it("returns 402 on insufficient payment amount", async () => {
    const app = createTestApp({
      price: "$1.00",
      description: "Expensive endpoint",
    });

    const res = await app.request("/api/paid/generate", {
      headers: {
        "X-Payment": "x402 token=pay_low;amount=50;currency=USDC;network=base",
      },
    });

    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toBe("Payment Required");
  });

  it("returns 402 on currency mismatch", async () => {
    const app = createTestApp(defaultOptions);

    const res = await app.request("/api/paid/generate", {
      headers: {
        "X-Payment": "x402 token=pay_eth;amount=1;currency=ETH;network=base",
      },
    });

    expect(res.status).toBe(402);
  });

  it("returns 402 on invalid payment header format", async () => {
    const app = createTestApp(defaultOptions);

    const res = await app.request("/api/paid/generate", {
      headers: {
        "X-Payment": "Bearer invalid_token",
      },
    });

    expect(res.status).toBe(402);
  });

  it("calls onPaymentSettled callback on successful payment", async () => {
    const onPaymentSettled = vi.fn();
    const app = createTestApp({
      ...defaultOptions,
      onPaymentSettled,
    });

    await app.request("/api/paid/generate", {
      headers: {
        "X-Payment": "x402 token=pay_track;amount=1;currency=USDC;network=base",
      },
    });

    expect(onPaymentSettled).toHaveBeenCalledWith(
      expect.objectContaining({
        token: "pay_track",
        amountInCents: 1,
        currency: "USDC",
        endpoint: "/api/paid/generate",
        status: "settled",
      }),
    );
  });

  it("sets X-Payment-Status header on successful payment", async () => {
    const app = createTestApp(defaultOptions);

    const res = await app.request("/api/paid/generate", {
      headers: {
        "X-Payment": "x402 token=pay_ok;amount=1;currency=USDC;network=base",
      },
    });

    expect(res.headers.get("X-Payment-Status")).toBe("settled");
  });
});
