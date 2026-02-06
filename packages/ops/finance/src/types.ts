/**
 * Finance — Types & Interfaces
 *
 * Revenue and cost source interfaces, financial metrics, invoice types.
 * All monetary values are in cents (consistent with Stripe).
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Revenue Source Interface
// ---------------------------------------------------------------------------

export interface RevenueSource {
  readonly name: string;

  /** Get Monthly Recurring Revenue (in cents) */
  getMRR(options?: DateRangeOptions): Promise<number>;

  /** Get churn rate as a percentage (0-100) */
  getChurnRate(options?: DateRangeOptions): Promise<number>;

  /** Get Lifetime Value per customer (in cents) */
  getLTV(): Promise<number>;

  /** Get total subscriber/customer count */
  getSubscriberCount(): Promise<number>;

  /** Get total revenue for a period (in cents) */
  getRevenue(options: DateRangeOptions): Promise<number>;

  /** Get revenue entries for a period */
  getRevenueEntries(options: DateRangeOptions): Promise<RevenueEntry[]>;
}

// ---------------------------------------------------------------------------
// Cost Source Interface
// ---------------------------------------------------------------------------

export interface CostSource {
  readonly name: string;

  /** Get total cost for a period (in cents) */
  getCost(options: DateRangeOptions): Promise<number>;

  /** Get cost entries for a period */
  getCostEntries(options: DateRangeOptions): Promise<CostEntry[]>;
}

// ---------------------------------------------------------------------------
// Date Range
// ---------------------------------------------------------------------------

export const DateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date(),
});

export type DateRangeOptions = z.infer<typeof DateRangeSchema>;

// ---------------------------------------------------------------------------
// Revenue Entry
// ---------------------------------------------------------------------------

export const RevenueEntrySchema = z.object({
  id: z.string().min(1),
  date: z.date(),
  /** Amount in cents */
  amount: z.number().int(),
  description: z.string(),
  source: z.string(),
  category: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type RevenueEntry = z.infer<typeof RevenueEntrySchema>;

// ---------------------------------------------------------------------------
// Cost Entry
// ---------------------------------------------------------------------------

export const CostEntrySchema = z.object({
  id: z.string().min(1),
  date: z.date(),
  /** Amount in cents (positive number) */
  amount: z.number().int().nonnegative(),
  description: z.string(),
  source: z.string(),
  category: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type CostEntry = z.infer<typeof CostEntrySchema>;

// ---------------------------------------------------------------------------
// MRR Metrics
// ---------------------------------------------------------------------------

export const MRRMetricsSchema = z.object({
  /** Current MRR in cents */
  current: z.number().int().nonnegative(),
  /** Previous period MRR in cents */
  previous: z.number().int().nonnegative(),
  /** Growth rate percentage */
  growthRate: z.number(),
  /** New MRR from new customers (cents) */
  newMRR: z.number().int().nonnegative(),
  /** Lost MRR from churned customers (cents) */
  churnedMRR: z.number().int().nonnegative(),
  /** Net new MRR (cents) */
  netNewMRR: z.number().int(),
});

export type MRRMetrics = z.infer<typeof MRRMetricsSchema>;

// ---------------------------------------------------------------------------
// Finance Report
// ---------------------------------------------------------------------------

export const FinanceReportSchema = z.object({
  period: z.enum(["weekly", "monthly", "quarterly", "yearly"]),
  startDate: z.date(),
  endDate: z.date(),
  generatedAt: z.date(),

  /** Total revenue in cents across all sources */
  totalRevenue: z.number().int(),
  /** Total costs in cents across all sources */
  totalCosts: z.number().int(),
  /** Profit in cents (revenue - costs) */
  profit: z.number().int(),
  /** Profit margin percentage */
  profitMargin: z.number(),

  /** Revenue broken down by source */
  revenueBySource: z.array(
    z.object({
      source: z.string(),
      amount: z.number().int(),
    }),
  ),

  /** Costs broken down by source */
  costsBySource: z.array(
    z.object({
      source: z.string(),
      amount: z.number().int(),
    }),
  ),

  /** MRR metrics (if any subscription revenue sources) */
  mrr: MRRMetricsSchema.optional(),

  /** Churn rate across all subscription sources */
  churnRate: z.number().min(0).max(100).optional(),

  /** LTV across all subscription sources */
  ltv: z.number().int().nonnegative().optional(),
});

export type FinanceReport = z.infer<typeof FinanceReportSchema>;

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export const InvoiceItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  /** Unit price in cents */
  unitPrice: z.number().int().nonnegative(),
  /** Total in cents (quantity * unitPrice) */
  total: z.number().int().nonnegative(),
});

export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;

export const InvoiceSchema = z.object({
  id: z.string().min(1),
  invoiceNumber: z.string().min(1),
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional(),
  clientAddress: z.string().optional(),

  items: z.array(InvoiceItemSchema).min(1),
  /** Subtotal in cents */
  subtotal: z.number().int().nonnegative(),
  /** Tax rate percentage (0-100) */
  taxRate: z.number().min(0).max(100).default(0),
  /** Tax amount in cents */
  taxAmount: z.number().int().nonnegative().default(0),
  /** Total in cents */
  total: z.number().int().nonnegative(),

  currency: z.string().default("USD"),
  issueDate: z.date(),
  dueDate: z.date(),
  status: z
    .enum(["draft", "sent", "paid", "overdue", "cancelled"])
    .default("draft"),
  notes: z.string().optional(),
});

export type Invoice = z.infer<typeof InvoiceSchema>;

export const InvoiceInputSchema = z.object({
  clientName: z.string().min(1),
  clientEmail: z.string().email().optional(),
  clientAddress: z.string().optional(),
  items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().int().positive().default(1),
        /** Unit price in cents */
        unitPrice: z.number().int().nonnegative(),
      }),
    )
    .min(1),
  taxRate: z.number().min(0).max(100).default(0),
  currency: z.string().default("USD"),
  dueDate: z.date(),
  notes: z.string().optional(),
});

export type InvoiceInput = z.input<typeof InvoiceInputSchema>;

// ---------------------------------------------------------------------------
// JSONL Entry (for manual sources)
// ---------------------------------------------------------------------------

export const JsonlEntrySchema = z.object({
  date: z.string().transform((s) => new Date(s)),
  /** Amount in cents */
  amount: z.number().int(),
  description: z.string(),
  category: z.string().optional(),
});

export type JsonlEntry = z.infer<typeof JsonlEntrySchema>;

// ---------------------------------------------------------------------------
// Hosting Provider Config
// ---------------------------------------------------------------------------

export const HostingProviderSchema = z.enum(["railway", "flyio"]);

export type HostingProvider = z.infer<typeof HostingProviderSchema>;

export interface HostingConfig {
  provider: HostingProvider;
  apiKey: string;
  projectId?: string;
}

// ---------------------------------------------------------------------------
// Stripe Config
// ---------------------------------------------------------------------------

export interface StripeConfig {
  apiKey: string;
}

// ---------------------------------------------------------------------------
// Report Aggregator Config
// ---------------------------------------------------------------------------

export interface ReportAggregatorConfig {
  revenueSources: RevenueSource[];
  costSources: CostSource[];
}

// ---------------------------------------------------------------------------
// Invoice Generator Config
// ---------------------------------------------------------------------------

export interface InvoiceGeneratorConfig {
  templatePath?: string;
  fromName?: string;
  fromEmail?: string;
  fromAddress?: string;
}

// ---------------------------------------------------------------------------
// CLI Output Formatters
// ---------------------------------------------------------------------------

export type ReportPeriod = "weekly" | "monthly" | "quarterly" | "yearly";

export interface CliReportOptions {
  period: ReportPeriod;
  startDate?: Date;
  endDate?: Date;
}
