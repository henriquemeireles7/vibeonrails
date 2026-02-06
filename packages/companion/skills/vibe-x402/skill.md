# x402 Revenue Monitoring — OpenClaw Skill

> skill_format_version: 1
> min_openclaw_version: 0.5.0

## What This Skill Does

Monitors x402 pay-per-API-call revenue and provides daily reports.
The companion reports daily x402 revenue, top-earning endpoints, and payment failures.

## Commands

### Daily Revenue Report

**Trigger:** "What's my x402 revenue?" or scheduled daily at 9:00 AM

**Action:**

```bash
vibe status --module x402 --format json
```

**Response template:**

```
x402 Revenue Report ({date}):
- Total revenue: ${total_revenue} USDC
- Transactions: {transaction_count}
- Top endpoint: {top_endpoint} (${top_endpoint_revenue})
- Failed payments: {failed_count}
```

### Top Earning Endpoints

**Trigger:** "Which endpoints earn the most?"

**Action:**

```bash
vibe status --module x402 --top-endpoints --format json
```

**Response template:**

```
Top x402 Endpoints:
1. {endpoint_1} - ${revenue_1} ({calls_1} calls)
2. {endpoint_2} - ${revenue_2} ({calls_2} calls)
3. {endpoint_3} - ${revenue_3} ({calls_3} calls)
```

### Payment Failures

**Trigger:** "Are there any payment failures?"

**Action:**

```bash
vibe status --module x402 --failures --format json
```

**Response template:**

```
x402 Payment Failures ({period}):
- Total failures: {failure_count}
- Most common reason: {top_reason}
- Affected endpoints: {affected_endpoints}
```

### Revenue Trend

**Trigger:** "How is x402 revenue trending?"

**Action:**

```bash
vibe status --module x402 --trend --days 7 --format json
```

**Response template:**

```
x402 Revenue Trend (last 7 days):
{day_1}: ${revenue_1}
{day_2}: ${revenue_2}
...
Trend: {up/down/stable} ({percentage}%)
```

## Configuration

This skill reads from the project's `.vibe/project.json` to determine:

- Which endpoints have x402 pricing enabled
- The finance module configuration for revenue tracking
- Alert thresholds for payment failure rates

## Channels

- **#finance** — Daily revenue reports (scheduled)
- **#alerts** — Payment failure alerts (>5% failure rate)

## Dependencies

- `@vibeonrails/core` with x402 module enabled
- Finance module for revenue aggregation
- VoR CLI accessible from the companion's environment
