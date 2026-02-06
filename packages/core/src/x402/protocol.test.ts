import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createPaidRoute,
  parsePaymentHeader,
  validatePayment,
  createPaymentRequired,
  trackRevenue,
  type PaidRouteConfig,
  type PaymentHeader,
  type RevenueRecord,
} from "./protocol.js";

// VOR: x402 protocol tests - payment header parsing, validation, settlement, 402 response

describe("x402 Protocol", () => {
  describe("parsePaymentHeader", () => {
    it("parses valid x402 payment header", () => {
      const header =
        "x402 token=pay_abc123;amount=100;currency=USDC;network=base";
      const result = parsePaymentHeader(header);

      expect(result).toEqual({
        scheme: "x402",
        token: "pay_abc123",
        amount: 100,
        currency: "USDC",
        network: "base",
      });
    });

    it("returns null for missing header", () => {
      expect(parsePaymentHeader(undefined)).toBeNull();
      expect(parsePaymentHeader("")).toBeNull();
    });

    it("returns null for invalid header format", () => {
      expect(parsePaymentHeader("Bearer token123")).toBeNull();
      expect(parsePaymentHeader("x402 invalid")).toBeNull();
    });

    it("parses header with minimal required fields", () => {
      const header = "x402 token=pay_xyz;amount=50;currency=USDC;network=base";
      const result = parsePaymentHeader(header);

      expect(result).not.toBeNull();
      expect(result?.token).toBe("pay_xyz");
      expect(result?.amount).toBe(50);
    });
  });

  describe("createPaidRoute", () => {
    it("creates config with price in cents", () => {
      const config = createPaidRoute({
        price: "$0.01",
        description: "Generate a poem",
      });

      expect(config.priceInCents).toBe(1);
      expect(config.currency).toBe("USDC");
      expect(config.description).toBe("Generate a poem");
    });

    it("handles various price formats", () => {
      expect(createPaidRoute({ price: "$1.00" }).priceInCents).toBe(100);
      expect(createPaidRoute({ price: "$0.50" }).priceInCents).toBe(50);
      expect(createPaidRoute({ price: "$10" }).priceInCents).toBe(1000);
    });

    it("uses USDC as default currency", () => {
      const config = createPaidRoute({ price: "$0.01" });
      expect(config.currency).toBe("USDC");
    });

    it("supports custom network", () => {
      const config = createPaidRoute({ price: "$0.01", network: "ethereum" });
      expect(config.network).toBe("ethereum");
    });

    it("defaults to base network", () => {
      const config = createPaidRoute({ price: "$0.01" });
      expect(config.network).toBe("base");
    });
  });

  describe("validatePayment", () => {
    it("validates matching payment amount", () => {
      const config = createPaidRoute({ price: "$0.01" });
      const payment: PaymentHeader = {
        scheme: "x402",
        token: "pay_valid",
        amount: 1,
        currency: "USDC",
        network: "base",
      };

      const result = validatePayment(payment, config);
      expect(result.valid).toBe(true);
    });

    it("rejects insufficient payment amount", () => {
      const config = createPaidRoute({ price: "$1.00" });
      const payment: PaymentHeader = {
        scheme: "x402",
        token: "pay_low",
        amount: 50,
        currency: "USDC",
        network: "base",
      };

      const result = validatePayment(payment, config);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("insufficient_amount");
    });

    it("rejects currency mismatch", () => {
      const config = createPaidRoute({ price: "$0.01" });
      const payment: PaymentHeader = {
        scheme: "x402",
        token: "pay_wrong_currency",
        amount: 1,
        currency: "ETH",
        network: "base",
      };

      const result = validatePayment(payment, config);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("currency_mismatch");
    });

    it("rejects network mismatch", () => {
      const config = createPaidRoute({ price: "$0.01", network: "base" });
      const payment: PaymentHeader = {
        scheme: "x402",
        token: "pay_wrong_network",
        amount: 1,
        currency: "USDC",
        network: "ethereum",
      };

      const result = validatePayment(payment, config);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe("network_mismatch");
    });
  });

  describe("createPaymentRequired", () => {
    it("creates 402 response body with payment instructions", () => {
      const config = createPaidRoute({
        price: "$0.01",
        description: "AI generation",
      });
      const body = createPaymentRequired(config, "/api/generate");

      expect(body.status).toBe(402);
      expect(body.error).toBe("Payment Required");
      expect(body.payment.price).toBe("$0.01");
      expect(body.payment.currency).toBe("USDC");
      expect(body.payment.network).toBe("base");
      expect(body.payment.endpoint).toBe("/api/generate");
      expect(body.payment.description).toBe("AI generation");
    });

    it("includes payment header format instructions", () => {
      const config = createPaidRoute({ price: "$0.50" });
      const body = createPaymentRequired(config, "/api/endpoint");

      expect(body.payment.headerFormat).toBe(
        "x402 token=<payment_token>;amount=50;currency=USDC;network=base",
      );
    });
  });

  describe("trackRevenue", () => {
    it("creates a revenue record from a successful payment", () => {
      const record = trackRevenue({
        token: "pay_abc",
        amount: 100,
        currency: "USDC",
        network: "base",
        endpoint: "/api/generate",
      });

      expect(record.token).toBe("pay_abc");
      expect(record.amountInCents).toBe(100);
      expect(record.currency).toBe("USDC");
      expect(record.endpoint).toBe("/api/generate");
      expect(record.timestamp).toBeTypeOf("number");
      expect(record.status).toBe("settled");
    });
  });
});
