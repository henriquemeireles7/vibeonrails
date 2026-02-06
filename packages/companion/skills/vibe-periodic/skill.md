# Periodic Tasks — OpenClaw Skill

> skill_format_version: 1
> min_openclaw_version: 0.5.0

## What This Skill Does

Scheduled tasks for the VoR Companion. Runs weekly finance reports,
daily content generation, and support summaries on a configurable schedule.
Personality and schedule configured via `content/brand/agent.md`.

## Scheduled Tasks

### Weekly Finance Report (Monday 9:00 AM)

**Schedule:** Every Monday at 9:00 AM (project timezone)
**Channel:** #finance

**Action:**

```bash
vibe report --weekly --format json
```

**Response template:**

```
Weekly Business Report ({week_start} - {week_end}):

Revenue:
- MRR: ${mrr} ({mrr_change})
- New subscriptions: {new_subs}
- Churned: {churned}
- Net revenue: ${net_revenue}

Growth:
- New users: {new_users}
- Active users: {active_users}
- Pageviews: {pageviews}

Support:
- Open tickets: {open_tickets}
- Resolved this week: {resolved_tickets}
- Avg response time: {avg_response_time}

Content:
- Posts published: {posts_published}
- Drafts in pipeline: {drafts_count}
```

### Daily Content Generation (Weekdays 10:00 AM)

**Schedule:** Monday-Friday at 10:00 AM
**Channel:** #content-review
**Condition:** Autopilot mode disabled (requires human approval)

**Action:**

```bash
vibe marketing generate --count 3 --format json
```

**Response template:**

```
Daily Content Drafts:

{draft_1_title}
{draft_1_preview}
Channel: {draft_1_channel}
[Approve] [Edit] [Reject]

{draft_2_title}
{draft_2_preview}
Channel: {draft_2_channel}
[Approve] [Edit] [Reject]

{draft_3_title}
{draft_3_preview}
Channel: {draft_3_channel}
[Approve] [Edit] [Reject]
```

### Support Summary (Friday 5:00 PM)

**Schedule:** Every Friday at 5:00 PM
**Channel:** #support

**Action:**

```bash
vibe status --module support --weekly --format json
```

**Response template:**

```
Weekly Support Summary:

Tickets:
- Total opened: {opened}
- Total resolved: {resolved}
- Still open: {still_open}
- Escalated: {escalated}

Top Issues:
1. {issue_1} ({count_1} tickets)
2. {issue_2} ({count_2} tickets)
3. {issue_3} ({count_3} tickets)

Customer Satisfaction: {csat_score}/5
```

## Configuration

Schedule and behavior configured via `content/brand/agent.md`:

```yaml
# In content/brand/agent.md frontmatter:
periodic:
  finance_report:
    enabled: true
    schedule: "monday 9:00"
    channel: "#finance"
  content_generation:
    enabled: true
    schedule: "weekdays 10:00"
    channel: "#content-review"
    count: 3
    autopilot: false
  support_summary:
    enabled: true
    schedule: "friday 17:00"
    channel: "#support"
```

## Dependencies

- `@vibeonrails/cli` for report and marketing commands
- VoR project with finance, marketing, or support modules installed
- Configured Discord channels for each task type
