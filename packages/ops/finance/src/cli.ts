/**
 * Finance CLI Commands
 *
 * Implements `npx vibe finance` commands:
 * - mrr, churn, ltv, expenses, report, invoice create
 */

import type { ReportAggregator } from "./report.js";
import type { InvoiceGenerator } from "./invoice.js";
import type { ReportPeriod, DateRangeOptions } from "./types.js";

// ---------------------------------------------------------------------------
// CLI Output Interface
// ---------------------------------------------------------------------------

export interface CliOutput {
  log(message: string): void;
  error(message: string): void;
  table(data: Record<string, unknown>[]): void;
}

function defaultOutput(): CliOutput {
  return {
    log: (msg) => process.stdout.write(`${msg}\n`),
    error: (msg) => process.stderr.write(`${msg}\n`),
    table: (data) => {
      if (data.length === 0) {
        process.stdout.write("No data.\n");
        return;
      }
      const keys = Object.keys(data[0]!);
      const header = keys.join("\t");
      process.stdout.write(`${header}\n`);
      for (const row of data) {
        const values = keys.map((k) => String(row[k] ?? ""));
        process.stdout.write(`${values.join("\t")}\n`);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Format Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// Finance CLI
// ---------------------------------------------------------------------------

export interface FinanceCliConfig {
  aggregator: ReportAggregator;
  invoiceGenerator: InvoiceGenerator;
  output?: CliOutput;
}

export interface FinanceCli {
  mrr(): Promise<void>;
  churn(options?: { period?: ReportPeriod }): Promise<void>;
  ltv(): Promise<void>;
  expenses(options: DateRangeOptions): Promise<void>;
  report(options: {
    period: ReportPeriod;
    startDate?: Date;
    endDate?: Date;
  }): Promise<void>;
  invoiceCreate(input: {
    clientName: string;
    clientEmail?: string;
    items: Array<{ description: string; quantity?: number; unitPrice: number }>;
    taxRate?: number;
    dueDate: Date;
    notes?: string;
  }): Promise<void>;
  invoiceList(): Promise<void>;
}

export function createFinanceCli(config: FinanceCliConfig): FinanceCli {
  const { aggregator, invoiceGenerator } = config;
  const out = config.output ?? defaultOutput();

  return {
    async mrr(): Promise<void> {
      const metrics = await aggregator.getMRRMetrics();

      out.log("=== MRR Metrics ===");
      out.log("");
      out.log(`Current MRR: ${formatCents(metrics.current)}`);
      out.log(`Previous MRR: ${formatCents(metrics.previous)}`);
      out.log(`Growth Rate: ${formatPercent(metrics.growthRate)}`);
      out.log(`New MRR: ${formatCents(metrics.newMRR)}`);
      out.log(`Churned MRR: ${formatCents(metrics.churnedMRR)}`);
      out.log(`Net New MRR: ${formatCents(metrics.netNewMRR)}`);
    },

    async churn(): Promise<void> {
      const report = await aggregator.generateReport({ period: "monthly" });

      out.log("=== Churn Rate ===");
      out.log("");
      if (report.churnRate !== undefined) {
        out.log(`Monthly Churn Rate: ${formatPercent(report.churnRate)}`);
      } else {
        out.log(
          "No churn data available (no subscription sources configured).",
        );
      }
    },

    async ltv(): Promise<void> {
      const report = await aggregator.generateReport({ period: "monthly" });

      out.log("=== Lifetime Value ===");
      out.log("");
      if (report.ltv !== undefined) {
        out.log(`Average LTV: ${formatCents(report.ltv)}`);
      } else {
        out.log("No LTV data available (no subscription sources configured).");
      }
    },

    async expenses(options: DateRangeOptions): Promise<void> {
      const entries = await aggregator.getAllCostEntries(options);
      const total = await aggregator.getTotalCosts(options);

      out.log("=== Expenses ===");
      out.log("");

      if (entries.length === 0) {
        out.log("No expenses found for this period.");
        return;
      }

      out.table(
        entries.map((e) => ({
          date: e.date.toISOString().split("T")[0],
          amount: formatCents(e.amount),
          description: e.description,
          source: e.source,
          category: e.category ?? "-",
        })),
      );

      out.log("");
      out.log(`Total: ${formatCents(total)}`);
    },

    async report(options): Promise<void> {
      const report = await aggregator.generateReport(options);

      out.log("=== Finance Report ===");
      out.log(
        `Period: ${report.period} (${report.startDate.toISOString().split("T")[0]} to ${report.endDate.toISOString().split("T")[0]})`,
      );
      out.log("");

      out.log("Revenue:");
      for (const source of report.revenueBySource) {
        out.log(`  ${source.source}: ${formatCents(source.amount)}`);
      }
      out.log(`  Total Revenue: ${formatCents(report.totalRevenue)}`);

      out.log("");
      out.log("Costs:");
      for (const source of report.costsBySource) {
        out.log(`  ${source.source}: ${formatCents(source.amount)}`);
      }
      out.log(`  Total Costs: ${formatCents(report.totalCosts)}`);

      out.log("");
      out.log(`Profit: ${formatCents(report.profit)}`);
      out.log(`Profit Margin: ${formatPercent(report.profitMargin)}`);

      if (report.mrr) {
        out.log("");
        out.log(`MRR: ${formatCents(report.mrr.current)}`);
      }
      if (report.churnRate !== undefined) {
        out.log(`Churn Rate: ${formatPercent(report.churnRate)}`);
      }
      if (report.ltv !== undefined) {
        out.log(`LTV: ${formatCents(report.ltv)}`);
      }
    },

    async invoiceCreate(input): Promise<void> {
      const invoice = await invoiceGenerator.create(input);

      out.log(`Invoice created: ${invoice.id}`);
      out.log(`  Number: ${invoice.invoiceNumber}`);
      out.log(`  Client: ${invoice.clientName}`);
      out.log(`  Total: ${formatCents(invoice.total)}`);
      out.log(`  Due: ${invoice.dueDate.toISOString().split("T")[0]}`);
      out.log(`  Status: ${invoice.status}`);
    },

    async invoiceList(): Promise<void> {
      const invoices = await invoiceGenerator.list();

      if (invoices.length === 0) {
        out.log("No invoices found.");
        return;
      }

      out.table(
        invoices.map((inv) => ({
          id: inv.id,
          number: inv.invoiceNumber,
          client: inv.clientName,
          total: formatCents(inv.total),
          due: inv.dueDate.toISOString().split("T")[0],
          status: inv.status,
        })),
      );

      out.log(`\n${invoices.length} invoice(s) total.`);
    },
  };
}
