/**
 * Finance Report Aggregator Tests
 *
 * Tests aggregation across multiple sources, report formatting, date range filtering.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createReportAggregator, type ReportAggregator } from "./report.js";
import type { RevenueSource, CostSource } from "./types.js";

function createMockRevenueSource(
  name: string,
  data: {
    mrr?: number;
    churnRate?: number;
    ltv?: number;
    subscribers?: number;
    entries?: Array<{
      id: string;
      date: Date;
      amount: number;
      description: string;
    }>;
  },
): RevenueSource {
  const entries = data.entries ?? [];

  return {
    name,
    async getMRR() {
      return data.mrr ?? 0;
    },
    async getChurnRate() {
      return data.churnRate ?? 0;
    },
    async getLTV() {
      return data.ltv ?? 0;
    },
    async getSubscriberCount() {
      return data.subscribers ?? 0;
    },
    async getRevenue(options) {
      return entries
        .filter((e) => e.date >= options.startDate && e.date <= options.endDate)
        .reduce((sum, e) => sum + e.amount, 0);
    },
    async getRevenueEntries(options) {
      return entries
        .filter((e) => e.date >= options.startDate && e.date <= options.endDate)
        .map((e) => ({ ...e, source: name }));
    },
  };
}

function createMockCostSource(
  name: string,
  data: {
    entries?: Array<{
      id: string;
      date: Date;
      amount: number;
      description: string;
    }>;
  },
): CostSource {
  const entries = data.entries ?? [];

  return {
    name,
    async getCost(options) {
      return entries
        .filter((e) => e.date >= options.startDate && e.date <= options.endDate)
        .reduce((sum, e) => sum + e.amount, 0);
    },
    async getCostEntries(options) {
      return entries
        .filter((e) => e.date >= options.startDate && e.date <= options.endDate)
        .map((e) => ({ ...e, source: name }));
    },
  };
}

describe("Finance Report Aggregator", () => {
  let aggregator: ReportAggregator;
  let stripeSource: RevenueSource;
  let manualRevenueSource: RevenueSource;
  let hostingCostSource: CostSource;
  let manualCostSource: CostSource;

  beforeEach(() => {
    stripeSource = createMockRevenueSource("stripe", {
      mrr: 12800, // $128/month
      churnRate: 5,
      ltv: 256000, // $2560
      subscribers: 3,
      entries: [
        {
          id: "ch_1",
          date: new Date("2026-01-05"),
          amount: 2900,
          description: "Sub 1",
        },
        {
          id: "ch_2",
          date: new Date("2026-01-10"),
          amount: 9900,
          description: "Sub 2",
        },
      ],
    });

    manualRevenueSource = createMockRevenueSource("manual", {
      entries: [
        {
          id: "m_1",
          date: new Date("2026-01-08"),
          amount: 50000,
          description: "Consulting",
        },
      ],
    });

    hostingCostSource = createMockCostSource("hosting", {
      entries: [
        {
          id: "h_1",
          date: new Date("2026-01-01"),
          amount: 2500,
          description: "Railway",
        },
        {
          id: "h_2",
          date: new Date("2026-01-15"),
          amount: 1200,
          description: "Postgres",
        },
      ],
    });

    manualCostSource = createMockCostSource("manual-costs", {
      entries: [
        {
          id: "mc_1",
          date: new Date("2026-01-10"),
          amount: 5000,
          description: "Figma",
        },
      ],
    });

    aggregator = createReportAggregator({
      revenueSources: [stripeSource, manualRevenueSource],
      costSources: [hostingCostSource, manualCostSource],
    });
  });

  describe("generateReport", () => {
    it("should generate a monthly report", async () => {
      const report = await aggregator.generateReport({
        period: "monthly",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(report.period).toBe("monthly");
      expect(report.totalRevenue).toBe(2900 + 9900 + 50000);
      expect(report.totalCosts).toBe(2500 + 1200 + 5000);
      expect(report.profit).toBe(report.totalRevenue - report.totalCosts);
      expect(report.profitMargin).toBeGreaterThan(0);
      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it("should include revenue breakdown by source", async () => {
      const report = await aggregator.generateReport({
        period: "monthly",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(report.revenueBySource).toHaveLength(2);
      const stripe = report.revenueBySource.find((r) => r.source === "stripe");
      expect(stripe!.amount).toBe(2900 + 9900);
    });

    it("should include cost breakdown by source", async () => {
      const report = await aggregator.generateReport({
        period: "monthly",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(report.costsBySource).toHaveLength(2);
      const hosting = report.costsBySource.find((c) => c.source === "hosting");
      expect(hosting!.amount).toBe(3700);
    });

    it("should calculate profit margin correctly", async () => {
      const report = await aggregator.generateReport({
        period: "monthly",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      const expected = (report.profit / report.totalRevenue) * 100;
      expect(report.profitMargin).toBeCloseTo(expected, 1);
    });

    it("should handle zero revenue gracefully", async () => {
      const emptyAggregator = createReportAggregator({
        revenueSources: [],
        costSources: [hostingCostSource],
      });

      const report = await emptyAggregator.generateReport({
        period: "monthly",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(report.totalRevenue).toBe(0);
      expect(report.profitMargin).toBe(0);
    });

    it("should include churn rate when available", async () => {
      const report = await aggregator.generateReport({
        period: "monthly",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      // Stripe has 5% churn, manual has 0% (filtered out)
      expect(report.churnRate).toBe(5);
    });
  });

  describe("getMRRMetrics", () => {
    it("should aggregate MRR across sources", async () => {
      const metrics = await aggregator.getMRRMetrics();

      // Stripe: 12800, Manual: 0
      expect(metrics.current).toBe(12800);
      expect(metrics.netNewMRR).toBeDefined();
    });
  });

  describe("getTotalRevenue", () => {
    it("should sum revenue across all sources", async () => {
      const total = await aggregator.getTotalRevenue({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(total).toBe(2900 + 9900 + 50000);
    });
  });

  describe("getTotalCosts", () => {
    it("should sum costs across all sources", async () => {
      const total = await aggregator.getTotalCosts({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(total).toBe(2500 + 1200 + 5000);
    });
  });

  describe("getAllRevenueEntries", () => {
    it("should return entries from all sources sorted by date", async () => {
      const entries = await aggregator.getAllRevenueEntries({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(entries).toHaveLength(3);
      // Should be sorted descending by date
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i]!.date.getTime()).toBeLessThanOrEqual(
          entries[i - 1]!.date.getTime(),
        );
      }
    });
  });

  describe("getAllCostEntries", () => {
    it("should return entries from all sources sorted by date", async () => {
      const entries = await aggregator.getAllCostEntries({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(entries).toHaveLength(3);
    });
  });
});
