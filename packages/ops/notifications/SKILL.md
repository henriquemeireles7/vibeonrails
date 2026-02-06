# @vibeonrails/notifications Skill

## Purpose

The `@vibeonrails/notifications` package provides multi-channel notification dispatch:

- **Types**: NotificationChannel, NotificationPreferences, DigestConfig, notification templates
- **Dispatcher**: Multi-channel dispatch with preference checking and digest batching
- **Storage**: Drizzle schema for in-app notifications, mark-as-read, list unread

## Structure

```
packages/ops/notifications/
├── src/
│   ├── types.ts              # Notification types with Zod schemas
│   ├── dispatcher.ts         # Multi-channel notification dispatcher
│   ├── dispatcher.test.ts    # Dispatcher tests
│   ├── storage.ts            # Drizzle schema and CRUD for in-app notifications
│   ├── storage.test.ts       # Storage tests
│   └── index.ts              # Barrel exports
├── SKILL.md
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── vitest.config.ts
```

## Patterns

### Sending a notification

```typescript
import { dispatch } from "@vibeonrails/notifications";

await dispatch({
  type: "ticket_escalated",
  recipient: "user_123",
  data: { ticketId: "ticket_456", subject: "Login issue" },
  channels: ["email", "in-app"],
});
```

### Checking user preferences

```typescript
import { shouldNotify } from "@vibeonrails/notifications";

const send = shouldNotify({
  userId: "user_123",
  notificationType: "marketing_digest",
  channel: "email",
  preferences: userPreferences,
});
```

### Digest batching

```typescript
import { createDigest } from "@vibeonrails/notifications";

const digest = createDigest({
  userId: "user_123",
  period: "daily",
  notifications: pendingNotifications,
  template: "daily-digest",
});
```

## Supported Channels

- **email** -- Via Resend (from @vibeonrails/infra)
- **in-app** -- Stored in database, rendered in frontend
- **push** -- Via Web Push API
- **discord** -- Via Companion (OpenClaw)

## Pitfalls

1. **Always check user preferences** before dispatching to any channel.
2. **Digest batching requires a cron job** -- Use @vibeonrails/infra queue for scheduling.
3. **In-app notifications need cleanup** -- Old notifications should be archived or deleted.
4. **Templates use Markdown** -- Render differently per channel (HTML for email, plain text for push).
