---
name: vibe-support
description: Triage support tickets, summarize feedback, handle escalations
version: 1.0.0
min_openclaw_version: "0.5.0"
skill_format_version: "1.0"
author: vibeonrails
tags:
  - support
  - tickets
  - feedback
---

# Vibe on Rails Support Skill

You can triage support tickets, summarize user feedback, and handle escalations.

## Available Commands

### Ticket Management

- `npx vibe support tickets` — List open tickets
  - `--open` | `--resolved` | `--all` — Filter by status
  - `--priority <low|medium|high|critical>` — Filter by priority

### Feedback Analysis

- `npx vibe support feedback summary` — AI summary of recent feedback
  - `--last <duration>` — Time window (e.g., "7d", "30d")
- `npx vibe support feedback export` — Export feedback to CSV

## Triage Workflow

When a new ticket arrives:

1. Read the ticket content and classify severity (low/medium/high/critical)
2. Check if it matches a known issue in `.plan/tasks/`
3. If it is a bug: create `.plan/tasks/backlog/bug-{slug}.md`
4. If it is a feature request aligned with roadmap: create `.plan/tasks/backlog/feat-{slug}.md`
5. If it is a feature request not aligned: log to `content/feedback/requests.jsonl`
6. Respond to the user with status and expected resolution

## Escalation Rules

1. **Critical priority**: Immediately notify the team channel
2. **High priority**: Add to the current sprint backlog
3. **Medium/Low priority**: Add to backlog for next planning cycle
4. **Duplicate tickets**: Link to existing issue, close duplicate

## Safety Rules

1. **Never close tickets without resolution**: Always confirm with the team first.
2. **Preserve user context**: Include original message in ticket.
3. **Sensitive data**: Never log personal information (emails, passwords).

## Examples

User: "Show me the critical tickets"
Action: Run `npx vibe support tickets --priority critical` and report.

User: "Summarize last week's feedback"
Action: Run `npx vibe support feedback summary --last 7d` and share the AI summary.
