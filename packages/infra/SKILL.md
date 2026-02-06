# @vibeonrails/infra Skill

## Purpose

The `@vibeonrails/infra` package provides infrastructure modules for production applications:

- **Health**: Registry-based health check system for monitoring
- **Logging**: Structured JSON logging with child loggers
- **Queue**: BullMQ-based background job processing
- **Email**: Resend-based transactional email with Markdown templates
- **Cache**: Redis-based caching with JSON serialization
- **Storage**: S3-compatible file storage
- **Realtime**: WebSocket server, channels, and subscriptions
- **Monitoring**: Metrics (counter, gauge, histogram) and request tracing

## Structure

```
packages/infra/
├── src/
│   ├── health/
│   │   ├── checks.ts                # Health check registry
│   │   └── index.ts
│   ├── logging/
│   │   ├── logger.ts                # Structured logger
│   │   └── index.ts
│   ├── queue/
│   │   ├── job.ts                   # Job definition helper
│   │   ├── worker.ts                # Queue worker setup
│   │   ├── cron.ts                  # Cron job definitions
│   │   └── index.ts
│   ├── email/
│   │   ├── client.ts                # Resend email client
│   │   ├── templates.ts             # Markdown template engine
│   │   └── index.ts
│   ├── cache/
│   │   ├── client.ts                # Redis cache client
│   │   └── index.ts
│   ├── storage/
│   │   ├── client.ts                # S3-compatible storage
│   │   └── index.ts
│   ├── realtime/
│   │   ├── server.ts                # WebSocket client management
│   │   ├── channels.ts              # Channel subscriptions
│   │   └── index.ts
│   ├── monitoring/
│   │   ├── metrics.ts               # Counter, gauge, histogram
│   │   ├── tracing.ts               # Request tracing with spans
│   │   └── index.ts
│   └── index.ts
├── SKILL.md
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Patterns

### Adding a health check

```typescript
import { registerHealthCheck } from '@vibeonrails/infra/health';

registerHealthCheck('database', async () => {
  await db.execute(sql`SELECT 1`);
  return { status: 'ok' };
});
```

### Defining a background job

```typescript
import { defineJob, enqueue } from '@vibeonrails/infra/queue';

const sendEmail = defineJob({
  name: 'send-email',
  schema: z.object({ to: z.string().email(), template: z.string() }),
  handler: async ({ to, template }) => { /* ... */ },
  options: { retries: 3, backoff: 'exponential' },
});

// Enqueue
await enqueue(sendEmail, { to: 'user@test.com', template: 'welcome' });
```

### Sending emails

```typescript
import { sendEmail } from '@vibeonrails/infra/email';

await sendEmail('welcome', {
  to: 'user@example.com',
  data: { name: 'John', appName: 'MyApp' },
});
```

### Scheduling cron jobs

```typescript
import { defineCron } from '@vibeonrails/infra/queue';

defineCron({
  name: 'cleanup-sessions',
  schedule: '0 0 * * *', // Daily at midnight
  handler: async () => { /* cleanup logic */ },
});
```

### WebSocket channels

```typescript
import { registerClient, subscribe, getSubscribers } from '@vibeonrails/infra/realtime';

registerClient({ id: 'user-1', send: (d) => ws.send(d), close: () => ws.close() });
subscribe('chat-room', 'user-1');
```

### Metrics collection

```typescript
import { increment, gauge, observe } from '@vibeonrails/infra/monitoring';

increment('http_requests', 1, { method: 'GET', path: '/api' });
gauge('active_connections', 42);
observe('response_time_ms', 150);
```

### Request tracing

```typescript
import { startSpan, endSpan, setSpanAttributes } from '@vibeonrails/infra/monitoring';

const span = startSpan('handle-request');
setSpanAttributes(span.spanId, { method: 'GET', url: '/api/users' });
// ... do work ...
endSpan(span.spanId);
```

## Pitfalls

1. **Health checks should be fast** — Set timeouts, don't run expensive queries
2. **Queue jobs must be idempotent** — They may be retried on failure
3. **Cache TTLs are required** — Never cache without expiration in production
4. **Email templates must exist** — Missing templates throw clear errors
