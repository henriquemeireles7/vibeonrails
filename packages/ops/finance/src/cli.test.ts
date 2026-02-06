/**
 * Finance CLI Tests
 *
 * Tests all finance CLI commands with mocked output.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createFinanceCli, type FinanceCli, type CliOutput } from "./cli.js";
import { createReportAggregator } from "./report.js";
import { createInvoiceGenerator } from "./invoice.js";
import type { RevenueSource, CostSource } from "./types.js";
import type { ReportAggregator } from "./report.js";
import type { InvoiceGenerator } from "./invoice.js";

function createTestOutput(): CliOutput & {
  messages: string[];
  errors: string[];
  tables: Record<string, unknown>[][];
} {
  const messages: string[] = [];
  const errors: string[] = [];
  const tables: Record<string, unknown>[][] = [];

  return {
    messages,
    errors,
    tables,
    log: (msg) => messages.push(msg),
    error: (msg) => errors.push(msg),
    table: (data) => tables.push(data),
  };
}

function createMockRevenueSource(): RevenueSource {
  return {
    name: "stripe",
    async getMRR() {
      return 12800;
    },
    async getChurnRate() {
      return 5;
    },
    async getLTV() {
      return 256000;
    },
    async getSubscriberCount() {
      return 3;
    },
    async getRevenue() {
      return 12800;
    },
    async getRevenueEntries(options) {
      return [
        {
          id: "ch_1",
          date: new Date("2026-01-05"),
          amount: 2900,
          description: "Sub 1",
          source: "stripe",
        },
        {
          id: "ch_2",
          date: new Date("2026-01-10"),
          amount: 9900,
          description: "Sub 2",
          source: "stripe",
        },
      ];
    },
  };
}

function createMockCostSource(): CostSource {
  return {
    name: "hosting",
    async getCost() {
      return 3700;
    },
    async getCostEntries(options) {
      return [
        {
          id: "h_1",
          date: new Date("2026-01-01"),
          amount: 2500,
          description: "Railway",
          source: "hosting",
          category: "hosting",
        },
        {
          id: "h_2",
          date: new Date("2026-01-15"),
          amount: 1200,
          description: "Postgres",
          source: "hosting",
          category: "hosting",
        },
      ];
    },
  };
}

describe("Finance CLI", () => {
  let aggregator: ReportAggregator;
  let invoiceGen: InvoiceGenerator;
  let output: ReturnType<typeof createTestOutput>;
  let cli: FinanceCli;

  beforeEach(() => {
    aggregator = createReportAggregator({
      revenueSources: [createMockRevenueSource()],
      costSources: [createMockCostSource()],
    });
    invoiceGen = createInvoiceGenerator({
      fromName: "VoR Inc",
      fromEmail: "billing@vor.dev",
    });
    output = createTestOutput();
    cli = createFinanceCli({
      aggregator,
      invoiceGenerator: invoiceGen,
      output,
    });
  });

  // -----------------------------------------------------------------------
  // MRR
  // -----------------------------------------------------------------------

  describe("mrr", () => {
    it("should display MRR metrics", async () => {
      await cli.mrr();
      expect(output.messages.some((m) => m.includes("MRR Metrics"))).toBe(true);
      expect(
        output.messages.some((m) => m.includes("Current MRR: $128.00")),
      ).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Churn
  // -----------------------------------------------------------------------

  describe("churn", () => {
    it("should display churn rate", async () => {
      await cli.churn();
      expect(output.messages.some((m) => m.includes("Churn Rate"))).toBe(true);
      expect(output.messages.some((m) => m.includes("5.00%"))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // LTV
  // -----------------------------------------------------------------------

  describe("ltv", () => {
    it("should display LTV", async () => {
      await cli.ltv();
      expect(output.messages.some((m) => m.includes("Lifetime Value"))).toBe(
        true,
      );
      expect(output.messages.some((m) => m.includes("$2560.00"))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Expenses
  // -----------------------------------------------------------------------

  describe("expenses", () => {
    it("should list expenses", async () => {
      await cli.expenses({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(output.tables).toHaveLength(1);
      expect(output.tables[0]).toHaveLength(2);
      expect(output.messages.some((m) => m.includes("Total: $37.00"))).toBe(
        true,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Report
  // -----------------------------------------------------------------------

  describe("report", () => {
    it("should display full financial report", async () => {
      await cli.report({
        period: "monthly",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-01-31"),
      });

      expect(output.messages.some((m) => m.includes("Finance Report"))).toBe(
        true,
      );
      expect(output.messages.some((m) => m.includes("Revenue:"))).toBe(true);
      expect(output.messages.some((m) => m.includes("Costs:"))).toBe(true);
      expect(output.messages.some((m) => m.includes("Profit:"))).toBe(true);
      expect(output.messages.some((m) => m.includes("MRR:"))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Invoice
  // -----------------------------------------------------------------------

  describe("invoice create", () => {
    it("should create an invoice and display info", async () => {
      await cli.invoiceCreate({
        clientName: "Acme Corp",
        clientEmail: "billing@acme.com",
        items: [{ description: "Monthly SaaS", unitPrice: 9900 }],
        dueDate: new Date("2026-02-28"),
      });

      expect(output.messages.some((m) => m.includes("Invoice created"))).toBe(
        true,
      );
      expect(output.messages.some((m) => m.includes("Acme Corp"))).toBe(true);
      expect(output.messages.some((m) => m.includes("$99.00"))).toBe(true);
    });
  });

  describe("invoice list", () => {
    it("should show empty message when no invoices", async () => {
      await cli.invoiceList();
      expect(output.messages).toContain("No invoices found.");
    });

    it("should list invoices in table format", async () => {
      await invoiceGen.create({
        clientName: "Corp A",
        items: [{ description: "Item", unitPrice: 5000 }],
        dueDate: new Date("2026-02-28"),
      });

      await cli.invoiceList();
      expect(output.tables).toHaveLength(1);
      expect(output.tables[0]).toHaveLength(1);
    });
  });
});
