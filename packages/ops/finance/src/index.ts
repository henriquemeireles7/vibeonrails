/**
 * @vibeonrails/finance — Barrel Exports
 *
 * Financial reporting: revenue sources, cost tracking, invoicing, and reports.
 */

// Types
export type {
  RevenueSource,
  RevenueEntry,
  CostSource,
  CostEntry,
  DateRangeOptions,
  MRRMetrics,
  FinanceReport,
  Invoice,
  InvoiceInput,
  InvoiceItem,
  JsonlEntry,
  HostingProvider,
  HostingConfig,
  StripeConfig,
  ReportAggregatorConfig,
  InvoiceGeneratorConfig,
  ReportPeriod,
  CliReportOptions,
} from "./types.js";

export {
  DateRangeSchema,
  RevenueEntrySchema,
  CostEntrySchema,
  MRRMetricsSchema,
  FinanceReportSchema,
  InvoiceSchema,
  InvoiceInputSchema,
  InvoiceItemSchema,
  JsonlEntrySchema,
  HostingProviderSchema,
} from "./types.js";

// Report Aggregator
export { createReportAggregator } from "./report.js";
export type { ReportAggregator } from "./report.js";

// Invoice Generator
export { createInvoiceGenerator } from "./invoice.js";
export type { InvoiceGenerator } from "./invoice.js";

// CLI
export { createFinanceCli } from "./cli.js";
export type { FinanceCli, FinanceCliConfig, CliOutput } from "./cli.js";

// Sources (re-export from subpath)
export {
  createStripeRevenueSource,
  createManualRevenueSource,
  createManualCostSource,
  createHostingCostSource,
} from "./sources/index.js";
