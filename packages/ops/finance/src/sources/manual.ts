/**
 * Manual Revenue & Cost Sources
 *
 * Implements RevenueSource and CostSource for JSONL files.
 * Each line in the JSONL file is a JSON object with date, amount, description.
 * Files: content/finance/income.jsonl, content/finance/expenses.jsonl
 */

import { z } from "zod";
import type {
  RevenueSource,
  RevenueEntry,
  CostSource,
  CostEntry,
  DateRangeOptions,
} from "../types.js";

// ---------------------------------------------------------------------------
// JSONL Parsing
// ---------------------------------------------------------------------------

const JsonlLineSchema = z.object({
  date: z.string(),
  amount: z.number().int(),
  description: z.string(),
  category: z.string().optional(),
});

type JsonlLine = z.infer<typeof JsonlLineSchema>;

function parseJsonlContent(content: string): JsonlLine[] {
  return content
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      try {
        const parsed: unknown = JSON.parse(line);
        return JsonlLineSchema.parse(parsed);
      } catch {
        throw new Error(`Invalid JSONL on line ${index + 1}: ${line}`);
      }
    });
}

function filterByDateRange(
  entries: JsonlLine[],
  options: DateRangeOptions,
): JsonlLine[] {
  return entries.filter((entry) => {
    const date = new Date(entry.date);
    return date >= options.startDate && date <= options.endDate;
  });
}

// ---------------------------------------------------------------------------
// File Reader Interface (abstract for testing)
// ---------------------------------------------------------------------------

export interface FileReader {
  readFile(path: string): Promise<string>;
}

// ---------------------------------------------------------------------------
// Manual Revenue Source
// ---------------------------------------------------------------------------

export interface ManualRevenueConfig {
  filePath: string;
  fileReader: FileReader;
}

export function createManualRevenueSource(
  config: ManualRevenueConfig,
): RevenueSource {
  async function loadEntries(options?: DateRangeOptions): Promise<JsonlLine[]> {
    const content = await config.fileReader.readFile(config.filePath);
    const entries = parseJsonlContent(content);
    return options ? filterByDateRange(entries, options) : entries;
  }

  return {
    name: "manual-revenue",

    async getMRR(options?: DateRangeOptions): Promise<number> {
      // Manual revenue is not recurring; return average monthly
      const now = new Date();
      const range = options ?? {
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        endDate: new Date(now.getFullYear(), now.getMonth(), 0),
      };
      const entries = await loadEntries(range);
      return entries.reduce((sum, e) => sum + e.amount, 0);
    },

    async getChurnRate(): Promise<number> {
      // Manual revenue has no churn concept
      return 0;
    },

    async getLTV(): Promise<number> {
      // Not applicable for manual revenue
      return 0;
    },

    async getSubscriberCount(): Promise<number> {
      // Not applicable
      return 0;
    },

    async getRevenue(options: DateRangeOptions): Promise<number> {
      const entries = await loadEntries(options);
      return entries.reduce((sum, e) => sum + e.amount, 0);
    },

    async getRevenueEntries(
      options: DateRangeOptions,
    ): Promise<RevenueEntry[]> {
      const entries = await loadEntries(options);
      return entries.map((entry, index) => ({
        id: `manual_rev_${index}`,
        date: new Date(entry.date),
        amount: entry.amount,
        description: entry.description,
        source: "manual-revenue",
        category: entry.category,
      }));
    },
  };
}

// ---------------------------------------------------------------------------
// Manual Cost Source
// ---------------------------------------------------------------------------

export interface ManualCostConfig {
  filePath: string;
  fileReader: FileReader;
}

export function createManualCostSource(config: ManualCostConfig): CostSource {
  async function loadEntries(options?: DateRangeOptions): Promise<JsonlLine[]> {
    const content = await config.fileReader.readFile(config.filePath);
    const entries = parseJsonlContent(content);
    return options ? filterByDateRange(entries, options) : entries;
  }

  return {
    name: "manual-costs",

    async getCost(options: DateRangeOptions): Promise<number> {
      const entries = await loadEntries(options);
      return entries.reduce((sum, e) => sum + e.amount, 0);
    },

    async getCostEntries(options: DateRangeOptions): Promise<CostEntry[]> {
      const entries = await loadEntries(options);
      return entries.map((entry, index) => ({
        id: `manual_cost_${index}`,
        date: new Date(entry.date),
        amount: entry.amount,
        description: entry.description,
        source: "manual-costs",
        category: entry.category,
      }));
    },
  };
}
