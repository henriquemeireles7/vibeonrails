# {{projectName}} — Vibe on Rails Application

## What is this?

A full-stack TypeScript application built with the **Vibe on Rails** framework.

## Architecture

```
src/
├── config/              # App configuration & env validation
│   ├── app.ts           # App name, port, env flags
│   ├── database.ts      # Database client instance
│   └── env.ts           # Zod-validated environment variables
├── modules/             # Feature modules (auth, user, post, ...)
│   ├── auth/            # Authentication (register, login, refresh, me)
│   ├── user/            # User management (profile, list)
│   └── post/            # Posts example (CRUD with ownership)
├── database/
│   └── seeds/           # Database seed scripts
├── main.ts              # Server entry point
└── router.ts            # Root tRPC router (merges all modules)
```

## Key Commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build for production |
| `npm run test` | Run tests |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed development database |
| `npm run db:studio` | Open Drizzle Studio GUI |
| `npx vibe generate module <name>` | Generate a new module |

## Module Pattern

Every module follows the same structure:

```
modules/<name>/
├── <name>.types.ts        # Zod schemas + TypeScript types
├── <name>.service.ts      # Business logic
├── <name>.controller.ts   # tRPC router (API endpoints)
└── <name>.test.ts         # Tests
```

## How to add a new module

1. Run `npx vibe generate module <name>`
2. Wire it into `src/router.ts`
3. Write your business logic in the service
4. Add tests

## Available Framework Packages

IMPORTANT: Before writing code from scratch, check if these packages already provide what you need.
Import from these packages instead of reimplementing functionality.

### Built-in (already installed)

| Need | Package | Example Import |
|------|---------|----------------|
| HTTP server, tRPC router, procedures | `@vibeonrails/core/api` | `import { createServer, router, protectedProcedure } from "@vibeonrails/core/api"` |
| Database ORM, repositories, seeds | `@vibeonrails/core/database` | `import { createDatabase, createUserRepository } from "@vibeonrails/core/database"` |
| JWT, passwords, sessions, OAuth, CSRF | `@vibeonrails/core/security` | `import { hashPassword, signAccessToken } from "@vibeonrails/core/security"` |
| Error classes (NotFoundError, etc.) | `@vibeonrails/core/errors` | `import { NotFoundError, ValidationError } from "@vibeonrails/core/errors"` |
| Health checks | `@vibeonrails/infra/health` | `import { registerHealthCheck } from "@vibeonrails/infra/health"` |
| Structured logging | `@vibeonrails/infra/logging` | `import { logger } from "@vibeonrails/infra/logging"` |
| Background jobs, cron | `@vibeonrails/infra/queue` | `import { defineJob, enqueue } from "@vibeonrails/infra/queue"` |
| Transactional email | `@vibeonrails/infra/email` | `import { sendEmail } from "@vibeonrails/infra/email"` |
| Redis cache | `@vibeonrails/infra/cache` | `import { createCache } from "@vibeonrails/infra/cache"` |
| File storage (S3) | `@vibeonrails/infra/storage` | `import { createStorage } from "@vibeonrails/infra/storage"` |
| WebSocket, real-time | `@vibeonrails/infra/realtime` | `import { registerClient, broadcast } from "@vibeonrails/infra/realtime"` |
| Metrics, tracing | `@vibeonrails/infra/monitoring` | `import { increment, observe } from "@vibeonrails/infra/monitoring"` |

### Optional (install with `vibe add`)

| Need | Package | Install Command |
|------|---------|-----------------|
| Stripe payments, subscriptions, webhooks | `@vibeonrails/payments` | `vibe add payments` |
| Auto-generated admin panel | `@vibeonrails/admin` | `vibe add admin` |
| Marketing content pipeline | `@vibeonrails/marketing` | `vibe add marketing` |
| CRM, contacts, deals, outreach | `@vibeonrails/sales` | `vibe add sales` |
| AI support chat widget | `@vibeonrails/support-chat` | `vibe add support-chat` |
| User feedback classification | `@vibeonrails/support-feedback` | `vibe add support-feedback` |
| Financial reporting, MRR, invoicing | `@vibeonrails/finance` | `vibe add finance` |
| Multi-channel notifications | `@vibeonrails/notifications` | `vibe add notifications` |

After installing an optional module, read the SKILL.md inside its folder for usage examples.

## Pitfalls

1. **Always validate env** — Never use `process.env` directly; use `src/config/env.ts`
2. **Keep services DB-agnostic** — Business logic should not import Drizzle directly
3. **Protected routes** — Use `protectedProcedure` for authenticated endpoints
4. **Don't reimplement** — Check the Available Framework Packages table above before writing code from scratch
5. **Read SKILL.md** — Every module folder has a SKILL.md with usage patterns and examples
