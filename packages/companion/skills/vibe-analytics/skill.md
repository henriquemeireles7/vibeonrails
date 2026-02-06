---
name: vibe-analytics
description: Query analytics data using natural language
version: 1.0.0
min_openclaw_version: "0.5.0"
skill_format_version: "1.0"
author: vibeonrails
tags:
  - analytics
  - data
  - reporting
---

# Vibe on Rails Analytics Skill

You can query analytics data using natural language and generate reports.

## Available Commands

### Natural Language Queries

- `npx vibe analytics query "<question>"` — AI-powered analytics query

### Event Tracking

- `npx vibe analytics events list --last <duration>` — Recent tracked events

### Reporting

- `npx vibe analytics report` — Analytics summary
  - `--weekly` | `--monthly` — Time period
- `npx vibe analytics pageviews --last <duration>` — Page view data

## Query Workflow

When the user asks an analytics question:

1. Translate the natural language question into an analytics query
2. Run `npx vibe analytics query "<question>"`
3. Present the results in a clear, formatted way
4. Include relevant context (time period, sample size, trends)

## Safety Rules

1. **Aggregate data only**: Never expose individual user data.
2. **Time-bounded queries**: Always include a time range to avoid scanning entire history.
3. **Validate results**: Sanity-check numbers before reporting (e.g., negative pageviews).

## Examples

User: "How many signups did we get this week?"
Action: Run `npx vibe analytics query "signups this week"` and report the count.

User: "What are our most visited pages?"
Action: Run `npx vibe analytics pageviews --last 30d` and report the top pages.

User: "Generate a monthly analytics report"
Action: Run `npx vibe analytics report --monthly` and share the summary.
