# @aor/infra Skill

## Purpose

The `@aor/infra` package provides infrastructure modules for production applications:

- **Health**: Registry-based health check system for monitoring
- **Logging**: Structured JSON logging with child loggers
- **Queue**: BullMQ-based background job processing
- **Email**: Resend-based transactional email with Markdown templates
- **Cache**: Redis-based caching with JSON serialization
- **Storage**: S3-compatible file storage

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
│   └── index.ts
├── SKILL.md
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Patterns

### Adding a health check

```typescript
import { registerHealthCheck } from '@aor/infra/health';

registerHealthCheck('database', async () => {
  await db.execute(sql`SELECT 1`);
  return { status: 'ok' };
});
```

### Defining a background job

```typescript
import { defineJob, enqueue } from '@aor/infra/queue';

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
import { sendEmail } from '@aor/infra/email';

await sendEmail('welcome', {
  to: 'user@example.com',
  data: { name: 'John', appName: 'MyApp' },
});
```

## Pitfalls

1. **Health checks should be fast** — Set timeouts, don't run expensive queries
2. **Queue jobs must be idempotent** — They may be retried on failure
3. **Cache TTLs are required** — Never cache without expiration in production
4. **Email templates must exist** — Missing templates throw clear errors
