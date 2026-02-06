# Infrastructure Overview

The `@vibeonrails/infra` package provides production-ready infrastructure modules for your Vibe on Rails application: health checks, structured logging, background jobs, email delivery, caching, file storage, real-time WebSocket communication, and monitoring with metrics and tracing.

Each module can be imported independently for tree-shaking:

```typescript
import { registerHealthCheck } from "@vibeonrails/infra/health";
import { logger } from "@vibeonrails/infra/logging";
import { defineJob, enqueue } from "@vibeonrails/infra/queue";
import { sendEmail } from "@vibeonrails/infra/email";
import { createCache } from "@vibeonrails/infra/cache";
import { createStorage } from "@vibeonrails/infra/storage";
import { broadcast, subscribe } from "@vibeonrails/infra/realtime";
import { increment, startSpan } from "@vibeonrails/infra/monitoring";
```

---

## Health Checks

A registry-based health check system for monitoring application and dependency health.

### `registerHealthCheck(name, checker)`

Register a named health check function.

```typescript
import {
  registerHealthCheck,
  runHealthChecks,
  memoryHealthCheck,
} from "@vibeonrails/infra/health";

// Built-in memory health check
registerHealthCheck("memory", memoryHealthCheck);

// Custom database health check
registerHealthCheck("database", async () => {
  try {
    await db.execute(sql`SELECT 1`);
    return { status: "healthy" };
  } catch (error) {
    return { status: "unhealthy", message: String(error) };
  }
});

// Custom Redis health check
registerHealthCheck("redis", async () => {
  try {
    await redis.ping();
    return { status: "healthy" };
  } catch (error) {
    return { status: "unhealthy", message: "Redis connection failed" };
  }
});
```

### `runHealthChecks()`

Runs all registered health checks and returns a report.

```typescript
const report = await runHealthChecks();

// report: {
//   status: 'healthy',
//   checks: {
//     memory: { status: 'healthy' },
//     database: { status: 'healthy' },
//     redis: { status: 'unhealthy', message: 'Connection refused' },
//   }
// }
```

### Integration with the Server

```typescript
import { runHealthChecks } from "@vibeonrails/infra/health";

app.get("/health", async (c) => {
  const report = await runHealthChecks();
  const statusCode = report.status === "healthy" ? 200 : 503;
  return c.json(report, statusCode);
});
```

### `removeHealthCheck(name)`

Removes a previously registered health check.

```typescript
removeHealthCheck("redis");
```

### Types

```typescript
type HealthStatus = "healthy" | "unhealthy" | "degraded";

interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
}

interface HealthReport {
  status: HealthStatus;
  checks: Record<string, HealthCheckResult>;
}
```

---

## Logging

Structured JSON logging with child loggers for contextual log messages.

### `logger`

The default application logger instance.

```typescript
import { logger } from "@vibeonrails/infra/logging";

logger.info("Server started", { port: 3000 });
logger.warn("Rate limit approaching", { ip: "192.168.1.1", count: 95 });
logger.error("Database connection failed", { error: err.message });
logger.debug("Processing request", { path: "/api/users", method: "GET" });
```

### `Logger` Class

Create custom logger instances with default context.

```typescript
import { Logger } from "@vibeonrails/infra/logging";

// Create a module-specific logger
const authLogger = new Logger({ module: "auth" });

authLogger.info("User logged in", { userId: "123" });
// Output: { "level": "info", "module": "auth", "message": "User logged in", "userId": "123", "timestamp": "..." }
```

### Log Levels

| Level   | Method           | Use Case                        |
| ------- | ---------------- | ------------------------------- |
| `debug` | `logger.debug()` | Detailed diagnostic information |
| `info`  | `logger.info()`  | General operational messages    |
| `warn`  | `logger.warn()`  | Warning conditions              |
| `error` | `logger.error()` | Error conditions                |

Set the minimum log level via environment variable:

```env
LOG_LEVEL=debug   # Show all logs
LOG_LEVEL=info    # Default — hide debug
LOG_LEVEL=warn    # Only warnings and errors
LOG_LEVEL=error   # Only errors
```

---

## Queue & Jobs

BullMQ-based background job processing with Redis. Define jobs, enqueue them, process them with workers, and schedule recurring tasks with cron.

### `defineJob(config)`

Define a named job with its processing logic.

```typescript
import { defineJob } from "@vibeonrails/infra/queue";

const sendWelcomeEmail = defineJob({
  name: "send-welcome-email",
  handler: async (data: { userId: string; email: string }) => {
    await sendEmail({
      to: data.email,
      subject: "Welcome!",
      body: "Thanks for signing up.",
    });
  },
});
```

### `enqueue(jobName, data, options?)`

Add a job to the queue for processing.

```typescript
import { enqueue } from "@vibeonrails/infra/queue";

// Enqueue immediately
await enqueue("send-welcome-email", {
  userId: user.id,
  email: user.email,
});

// Enqueue with delay
await enqueue(
  "send-reminder",
  { userId: user.id },
  {
    delay: 24 * 60 * 60 * 1000, // 24 hours
  },
);

// Enqueue with retry options
await enqueue(
  "process-payment",
  { orderId: order.id },
  {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
);
```

### `createQueueWorker()`

Start a worker that processes jobs from the queue.

```typescript
import { createQueueWorker } from "@vibeonrails/infra/queue";

const worker = createQueueWorker();
// Worker automatically picks up and processes jobs
```

### `defineCron(config)`

Schedule recurring jobs using cron expressions.

```typescript
import { defineCron } from "@vibeonrails/infra/queue";

// Run every day at midnight
defineCron({
  name: "daily-cleanup",
  pattern: "0 0 * * *",
  handler: async () => {
    await cleanupExpiredSessions();
    await purgeOldLogs();
  },
});

// Run every 5 minutes
defineCron({
  name: "metrics-snapshot",
  pattern: "*/5 * * * *",
  handler: async () => {
    await captureMetrics();
  },
});
```

### Job Management

```typescript
import {
  getCronJobs,
  getCronJob,
  clearCronJobs,
} from "@vibeonrails/infra/queue";

// List all cron jobs
const jobs = getCronJobs();

// Get a specific cron job
const job = getCronJob("daily-cleanup");

// Clear all cron jobs
clearCronJobs();
```

---

## Email

Transactional email delivery via **Resend** with Markdown template support.

### `sendEmail(options)`

Send an email.

```typescript
import { sendEmail } from "@vibeonrails/infra/email";

await sendEmail({
  to: "user@example.com",
  subject: "Password Reset",
  body: "Click the link below to reset your password:\n\nhttps://myapp.com/reset?token=abc123",
});
```

### Templates

Use Markdown templates with variable interpolation.

```typescript
import { loadTemplate, renderTemplate } from "@vibeonrails/infra/email";

// Load a template file
const template = await loadTemplate("welcome");

// Render with variables
const rendered = renderTemplate(template, {
  name: "John",
  appName: "My App",
  loginUrl: "https://myapp.com/login",
});

await sendEmail({
  to: "john@example.com",
  subject: rendered.subject,
  body: rendered.body,
});
```

Template file example (`emails/welcome.md`):

```markdown
---
subject: Welcome to {{appName}}!
---

Hi {{name}},

Welcome to **{{appName}}**! We're excited to have you.

[Sign in to your account]({{loginUrl}})

Cheers,
The {{appName}} Team
```

### Environment Variables

| Variable         | Description                                        |
| ---------------- | -------------------------------------------------- |
| `RESEND_API_KEY` | Your Resend API key                                |
| `EMAIL_FROM`     | Default sender address (e.g., `noreply@myapp.com`) |

---

## Cache

Redis-based caching with automatic JSON serialization.

### `createCache(config)`

Create a cache client.

```typescript
import { createCache } from "@vibeonrails/infra/cache";

const cache = createCache({ url: process.env.REDIS_URL! });
```

### Operations

```typescript
// Set a value (with TTL in milliseconds)
await cache.set("user:123", { name: "John", role: "admin" }, 60_000);

// Get a value
const user = await cache.get("user:123");
// { name: 'John', role: 'admin' }

// Delete a value
await cache.del("user:123");
```

### Cache-Aside Pattern

```typescript
async function getUserCached(id: string) {
  // Try cache first
  const cached = await cache.get(`user:${id}`);
  if (cached) return cached;

  // Miss — fetch from database
  const user = await userRepo.findById(id);
  if (user) {
    await cache.set(`user:${id}`, user, 5 * 60_000); // 5 minutes
  }
  return user;
}
```

---

## Storage

S3-compatible file storage for uploads, assets, and documents.

### `createStorage(config)`

Create a storage client.

```typescript
import { createStorage } from "@vibeonrails/infra/storage";

const storage = createStorage({
  bucket: process.env.S3_BUCKET!,
  region: process.env.S3_REGION!,
  accessKeyId: process.env.S3_ACCESS_KEY_ID!,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
});
```

### Operations

```typescript
// Upload a file
await storage.put("avatars/user-123.jpg", fileBuffer, {
  contentType: "image/jpeg",
});

// Get a file
const file = await storage.get("avatars/user-123.jpg");

// Delete a file
await storage.delete("avatars/user-123.jpg");

// Generate a signed URL (for temporary access)
const url = await storage.getSignedUrl("avatars/user-123.jpg", 3600); // 1 hour
```

### Environment Variables

| Variable               | Description                           |
| ---------------------- | ------------------------------------- |
| `S3_BUCKET`            | S3 bucket name                        |
| `S3_REGION`            | AWS region                            |
| `S3_ACCESS_KEY_ID`     | AWS access key                        |
| `S3_SECRET_ACCESS_KEY` | AWS secret key                        |
| `S3_ENDPOINT`          | Custom endpoint (for MinIO, R2, etc.) |

---

## Realtime / WebSocket

Real-time communication via WebSocket with channel-based pub/sub.

### Server-Side

```typescript
import {
  registerClient,
  removeClient,
  broadcast,
  sendToClient,
  onMessage,
  subscribe,
  unsubscribe,
} from "@vibeonrails/infra/realtime";

// Register a client connection
registerClient(clientId, ws);

// Handle incoming messages
onMessage(async (clientId, message) => {
  if (message.type === "subscribe") {
    subscribe(message.channel, clientId);
  }
});

// Send to a specific client
sendToClient(clientId, { type: "notification", data: { text: "Hello!" } });

// Broadcast to all connected clients
broadcast({ type: "announcement", data: { text: "Server update" } });
```

### Channel-Based Pub/Sub

```typescript
import {
  subscribe,
  unsubscribe,
  getSubscribers,
  getChannels,
} from "@vibeonrails/infra/realtime";

// Subscribe a client to a channel
subscribe("room:general", clientId);
subscribe("room:general", anotherClientId);

// Get all subscribers in a channel
const subscribers = getSubscribers("room:general");
// [clientId, anotherClientId]

// Get all active channels
const channels = getChannels();
// ['room:general']

// Unsubscribe
unsubscribe("room:general", clientId);
```

### Types

```typescript
interface WebSocketClient {
  id: string;
  ws: WebSocket;
}

interface WebSocketMessage {
  type: string;
  data?: unknown;
}

type MessageHandler = (
  clientId: string,
  message: WebSocketMessage,
) => void | Promise<void>;
```

---

## Monitoring: Metrics & Tracing

Application observability with custom metrics and distributed tracing.

### Metrics

```typescript
import {
  increment,
  gauge,
  observe,
  getAllMetrics,
} from "@vibeonrails/infra/monitoring";

// Counter — tracks totals
increment("http_requests_total", { method: "GET", path: "/api/users" });
increment("emails_sent", { template: "welcome" });

// Gauge — tracks current values
gauge("active_connections", 42);
gauge("queue_depth", pendingJobs.length);

// Histogram — tracks distributions
observe("http_request_duration_ms", 150, { path: "/api/users" });
observe("db_query_duration_ms", 23, { query: "findUser" });

// Get all metrics (for /metrics endpoint)
const metrics = getAllMetrics();
```

### Tracing

```typescript
import {
  startSpan,
  endSpan,
  setSpanAttributes,
  getActiveSpan,
} from "@vibeonrails/infra/monitoring";

// Start a span
const span = startSpan("processOrder");

try {
  setSpanAttributes(span.spanId, {
    orderId: order.id,
    userId: order.userId,
  });

  await processPayment(order);
  await sendConfirmation(order);

  endSpan(span.spanId);
} catch (error) {
  setSpanAttributes(span.spanId, { error: String(error) });
  endSpan(span.spanId);
  throw error;
}
```

### Types

```typescript
interface MetricValue {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes: Record<string, unknown>;
}
```

---

## Environment Variables Summary

| Variable               | Module       | Description                                  |
| ---------------------- | ------------ | -------------------------------------------- |
| `LOG_LEVEL`            | Logging      | Minimum log level (debug, info, warn, error) |
| `REDIS_URL`            | Queue, Cache | Redis connection string                      |
| `RESEND_API_KEY`       | Email        | Resend API key                               |
| `EMAIL_FROM`           | Email        | Default sender address                       |
| `S3_BUCKET`            | Storage      | S3 bucket name                               |
| `S3_REGION`            | Storage      | AWS region                                   |
| `S3_ACCESS_KEY_ID`     | Storage      | AWS access key                               |
| `S3_SECRET_ACCESS_KEY` | Storage      | AWS secret key                               |
| `S3_ENDPOINT`          | Storage      | Custom S3 endpoint                           |
