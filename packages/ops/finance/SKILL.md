# @vibeonrails/finance Skill

## Purpose

The `@vibeonrails/finance` package is a reporting and aggregation layer for financial data:

- **Revenue Sources**: Pluggable interface for tracking revenue (Stripe, manual JSONL)
- **Cost Sources**: Pluggable interface for tracking costs (hosting APIs, manual JSONL)
- **Reports**: Weekly/monthly financial summaries with profit calculation
- **Invoices**: Generate PDF invoices from markdown templates, send via email

## Structure

```
packages/ops/finance/
├── src/
│   ├── types.ts                  # RevenueSource, CostSource, FinanceReport, MRR, etc.
│   ├── sources/
│   │   ├── stripe.ts             # Stripe revenue source (MRR, churn, LTV)
│   │   ├── stripe.test.ts        # Stripe source tests
│   │   ├── manual.ts             # JSONL-based revenue and cost sources
│   │   ├── manual.test.ts        # Manual source tests
│   │   ├── hosting.ts            # Hosting provider cost source (Railway, Fly.io)
│   │   ├── hosting.test.ts       # Hosting source tests
│   │   └── index.ts              # Sources barrel
│   ├── report.ts                 # Report aggregator across all sources
│   ├── report.test.ts            # Report tests
│   ├── invoice.ts                # PDF invoice generator
│   ├── invoice.test.ts           # Invoice tests
│   ├── cli.ts                    # CLI commands (mrr, churn, ltv, expenses, report, invoice)
│   ├── cli.test.ts               # CLI tests
│   └── index.ts                  # Main barrel export
├── SKILL.md
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## Patterns

### Configuring revenue sources

```typescript
import { createStripeRevenueSource } from "@vibeonrails/finance/sources";
import { createManualRevenueSource } from "@vibeonrails/finance/sources";

const stripe = createStripeRevenueSource({
  apiKey: process.env.STRIPE_SECRET_KEY,
});
const manual = createManualRevenueSource({
  filePath: "content/finance/income.jsonl",
});
```

### Configuring cost sources

```typescript
import {
  createManualCostSource,
  createHostingCostSource,
} from "@vibeonrails/finance/sources";

const hosting = createHostingCostSource({
  provider: "railway",
  apiKey: process.env.RAILWAY_API_KEY,
});
const manual = createManualCostSource({
  filePath: "content/finance/expenses.jsonl",
});
```

### Generating reports

```typescript
import { createReportAggregator } from "@vibeonrails/finance";

const aggregator = createReportAggregator({
  revenueSources: [stripe, manual],
  costSources: [hosting, manualCosts],
});

const report = await aggregator.generateReport({
  period: "monthly",
  startDate: new Date("2026-01-01"),
  endDate: new Date("2026-01-31"),
});
```

### Creating invoices

```typescript
import { createInvoiceGenerator } from "@vibeonrails/finance";

const invoices = createInvoiceGenerator({
  templatePath: "content/finance/invoice-template.md",
});

const invoice = await invoices.create({
  clientName: "Acme Corp",
  items: [{ description: "Monthly SaaS subscription", amount: 9900 }],
  dueDate: new Date("2026-02-28"),
});
```

## Pitfalls

1. **All amounts are in cents** — Consistent with Stripe. Divide by 100 for display.
2. **Stripe source requires API key** — Will throw if key is missing.
3. **JSONL files are append-only** — Each line is a JSON object with date, amount, description.
4. **Reports aggregate across all sources** — MRR command shows total across all revenue sources.
5. **Invoice PDF is markdown-rendered** — Uses a simple HTML-to-PDF pipeline, not a design tool.
