/**
 * Manual Revenue/Cost Source Tests
 *
 * Tests JSONL reading, date filtering, and aggregation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createManualRevenueSource,
  createManualCostSource,
  type FileReader,
} from "./manual.js";
import type { RevenueSource, CostSource } from "../types.js";

const INCOME_JSONL = `{"date":"2026-01-05","amount":150000,"description":"Consulting project Alpha","category":"consulting"}
{"date":"2026-01-15","amount":50000,"description":"One-time license sale","category":"license"}
{"date":"2026-02-01","amount":75000,"description":"Consulting project Beta","category":"consulting"}
{"date":"2026-02-10","amount":25000,"description":"Workshop fee","category":"training"}`;

const EXPENSES_JSONL = `{"date":"2026-01-01","amount":2000,"description":"Domain renewal","category":"infrastructure"}
{"date":"2026-01-15","amount":15000,"description":"Contractor payment","category":"contractors"}
{"date":"2026-02-01","amount":5000,"description":"SaaS tools","category":"software"}
{"date":"2026-02-05","amount":8000,"description":"Cloud hosting","category":"infrastructure"}`;

function createMockFileReader(files: Record<string, string>): FileReader {
  return {
    async readFile(path: string): Promise<string> {
      const content = files[path];
      if (content === undefined) {
        throw new Error(`File not found: ${path}`);
      }
      return content;
    },
  };
}

describe("Manual Revenue Source", () => {
  let source: RevenueSource;

  beforeEach(() => {
    source = createManualRevenueSource({
      filePath: "content/finance/income.jsonl",
      fileReader: createMockFileReader({
        "content/finance/income.jsonl": INCOME_JSONL,
      }),
    });
  });

  it("should have the correct name", () => {
    expect(source.name).toBe("manual-revenue");
  });

  it("should calculate total revenue for a period", async () => {
    const revenue = await source.getRevenue({
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    });

    // 150000 + 50000 = 200000
    expect(revenue).toBe(200000);
  });

  it("should return revenue entries filtered by date", async () => {
    const entries = await source.getRevenueEntries({
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-02-28"),
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]!.description).toBe("Consulting project Beta");
    expect(entries[1]!.description).toBe("Workshop fee");
  });

  it("should return empty for date range with no entries", async () => {
    const entries = await source.getRevenueEntries({
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
    });

    expect(entries).toHaveLength(0);
  });

  it("should include source in entries", async () => {
    const entries = await source.getRevenueEntries({
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    });

    for (const entry of entries) {
      expect(entry.source).toBe("manual-revenue");
    }
  });

  it("should return 0 churn rate (not applicable)", async () => {
    const churn = await source.getChurnRate();
    expect(churn).toBe(0);
  });

  it("should return 0 subscriber count (not applicable)", async () => {
    const count = await source.getSubscriberCount();
    expect(count).toBe(0);
  });
});

describe("Manual Cost Source", () => {
  let source: CostSource;

  beforeEach(() => {
    source = createManualCostSource({
      filePath: "content/finance/expenses.jsonl",
      fileReader: createMockFileReader({
        "content/finance/expenses.jsonl": EXPENSES_JSONL,
      }),
    });
  });

  it("should have the correct name", () => {
    expect(source.name).toBe("manual-costs");
  });

  it("should calculate total cost for a period", async () => {
    const cost = await source.getCost({
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    });

    // 2000 + 15000 = 17000
    expect(cost).toBe(17000);
  });

  it("should return cost entries filtered by date", async () => {
    const entries = await source.getCostEntries({
      startDate: new Date("2026-02-01"),
      endDate: new Date("2026-02-28"),
    });

    expect(entries).toHaveLength(2);
    expect(entries[0]!.description).toBe("SaaS tools");
    expect(entries[1]!.description).toBe("Cloud hosting");
  });

  it("should include category in entries", async () => {
    const entries = await source.getCostEntries({
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    });

    const categories = entries.map((e) => e.category);
    expect(categories).toContain("infrastructure");
    expect(categories).toContain("contractors");
  });

  it("should handle empty date range", async () => {
    const entries = await source.getCostEntries({
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-12-31"),
    });

    expect(entries).toHaveLength(0);
  });
});

describe("JSONL Error Handling", () => {
  it("should throw on invalid JSONL content", async () => {
    const source = createManualRevenueSource({
      filePath: "bad.jsonl",
      fileReader: createMockFileReader({
        "bad.jsonl": 'not valid json\n{"also": "bad"}',
      }),
    });

    await expect(
      source.getRevenueEntries({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      }),
    ).rejects.toThrow("Invalid JSONL");
  });

  it("should throw on missing file", async () => {
    const source = createManualRevenueSource({
      filePath: "missing.jsonl",
      fileReader: createMockFileReader({}),
    });

    await expect(
      source.getRevenueEntries({
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
      }),
    ).rejects.toThrow("File not found");
  });
});
