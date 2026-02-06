---
name: vibe-finance
description: Report MRR, track costs, generate invoices
version: 1.0.0
min_openclaw_version: "0.5.0"
skill_format_version: "1.0"
author: vibeonrails
tags:
  - finance
  - revenue
  - invoicing
---

# Vibe on Rails Finance Skill

You can report financial metrics, track costs, and generate invoices.

## Available Commands

### Revenue Metrics

- `npx vibe finance mrr` — Current Monthly Recurring Revenue from Stripe
- `npx vibe finance churn` — Churn rate and details
- `npx vibe finance ltv` — Average customer lifetime value

### Cost Tracking

- `npx vibe finance expenses` — API costs (hosting, AI inference)

### Reporting

- `npx vibe finance report` — Full financial summary
  - `--weekly` | `--monthly` — Time period

### Invoicing

- `npx vibe finance invoice create --contact <id> --amount <n>` — Generate an invoice

## Reporting Workflow

When reporting financial metrics:

1. Pull latest data from all configured sources (Stripe, hosting, manual)
2. Calculate key metrics: MRR, churn rate, LTV, burn rate
3. Format as a clear summary with trends (up/down/flat)
4. Compare to previous period if available

## Safety Rules

1. **Read-only by default**: Financial commands are read-only except invoice creation.
2. **Verify amounts**: Always double-check invoice amounts before generation.
3. **Currency formatting**: Always include currency symbol and proper decimal places.
4. **Sensitive data**: Never share raw Stripe API keys or financial details publicly.

## Examples

User: "What's our MRR?"
Action: Run `npx vibe finance mrr` and report the current MRR with trend.

User: "Generate a weekly report"
Action: Run `npx vibe finance report --weekly` and share the summary.

User: "Create an invoice for $500 to John"
Action: Confirm details, then run `npx vibe finance invoice create --contact john --amount 500`.
