/**
 * Stripe Revenue Source Tests
 *
 * Tests with mock API client (fixture recordings).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createStripeRevenueSource, type StripeApiClient } from "./stripe.js";
import type { RevenueSource } from "../types.js";

function createMockStripeClient(): StripeApiClient {
  return {
    async listSubscriptions(params) {
      const status = params?.status ?? "active";

      if (status === "active") {
        return {
          data: [
            {
              id: "sub_1",
              status: "active",
              current_period_start: 1706745600,
              current_period_end: 1709424000,
              items: {
                data: [
                  {
                    price: {
                      unit_amount: 2900, // $29/month
                      recurring: { interval: "month", interval_count: 1 },
                    },
                    quantity: 1,
                  },
                ],
              },
              canceled_at: null,
              created: 1698768000,
            },
            {
              id: "sub_2",
              status: "active",
              current_period_start: 1706745600,
              current_period_end: 1709424000,
              items: {
                data: [
                  {
                    price: {
                      unit_amount: 9900, // $99/month
                      recurring: { interval: "month", interval_count: 1 },
                    },
                    quantity: 1,
                  },
                ],
              },
              canceled_at: null,
              created: 1701360000,
            },
            {
              id: "sub_3",
              status: "active",
              current_period_start: 1706745600,
              current_period_end: 1738281600,
              items: {
                data: [
                  {
                    price: {
                      unit_amount: 29900, // $299/year
                      recurring: { interval: "year", interval_count: 1 },
                    },
                    quantity: 1,
                  },
                ],
              },
              canceled_at: null,
              created: 1703952000,
            },
          ],
          has_more: false,
        };
      }

      if (status === "canceled") {
        return {
          data: [
            {
              id: "sub_canceled_1",
              status: "canceled",
              current_period_start: 1706745600,
              current_period_end: 1709424000,
              items: {
                data: [
                  {
                    price: {
                      unit_amount: 2900,
                      recurring: { interval: "month", interval_count: 1 },
                    },
                    quantity: 1,
                  },
                ],
              },
              canceled_at: 1707350400,
              created: 1698768000,
            },
          ],
          has_more: false,
        };
      }

      return { data: [], has_more: false };
    },

    async listCharges(params) {
      return {
        data: [
          {
            id: "ch_1",
            amount: 2900,
            currency: "usd",
            created: 1707004800,
            description: "Subscription payment",
            status: "succeeded",
          },
          {
            id: "ch_2",
            amount: 9900,
            currency: "usd",
            created: 1707091200,
            description: "Pro plan",
            status: "succeeded",
          },
          {
            id: "ch_3",
            amount: 5000,
            currency: "usd",
            created: 1707177600,
            description: "Failed charge",
            status: "failed",
          },
        ],
        has_more: false,
      };
    },
  };
}

describe("Stripe Revenue Source", () => {
  let source: RevenueSource;

  beforeEach(() => {
    source = createStripeRevenueSource(
      { apiKey: "sk_test_fake" },
      createMockStripeClient(),
    );
  });

  it("should have the correct name", () => {
    expect(source.name).toBe("stripe");
  });

  describe("MRR", () => {
    it("should calculate MRR from active subscriptions", async () => {
      const mrr = await source.getMRR();

      // $29/mo + $99/mo + $299/yr (= ~$24.92/mo)
      const expectedYearlyMonthly = Math.round(29900 / 12);
      const expected = 2900 + 9900 + expectedYearlyMonthly;

      expect(mrr).toBe(expected);
    });
  });

  describe("Churn Rate", () => {
    it("should calculate churn rate", async () => {
      const churnRate = await source.getChurnRate({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      // 1 canceled out of (3 active + 1 canceled) = 25%
      expect(churnRate).toBe(25);
    });
  });

  describe("Subscriber Count", () => {
    it("should return active subscriber count", async () => {
      const count = await source.getSubscriberCount();
      expect(count).toBe(3);
    });
  });

  describe("LTV", () => {
    it("should calculate LTV based on ARPU and churn", async () => {
      const ltv = await source.getLTV();
      // LTV = ARPU / churn_rate
      // ARPU = MRR / subscribers = total_mrr / 3
      // Churn = 25%
      expect(ltv).toBeGreaterThan(0);
    });
  });

  describe("Revenue Entries", () => {
    it("should return successful charges as revenue entries", async () => {
      const entries = await source.getRevenueEntries({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      // Should exclude failed charges
      expect(entries).toHaveLength(2);
      expect(entries[0]!.source).toBe("stripe");
      expect(entries[0]!.amount).toBe(2900);
    });

    it("should calculate total revenue", async () => {
      const revenue = await source.getRevenue({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      });

      expect(revenue).toBe(2900 + 9900); // Only succeeded charges
    });
  });
});
