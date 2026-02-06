# Vibe on Rails

> The TypeScript Framework for Vibe Coding

Vibe on Rails (VoR) is a full-stack TypeScript framework designed from the ground up
for AI-assisted development. Every folder has a SKILL.md that teaches AI agents how
to work with it. Predictable conventions mean zero ambiguity for both humans and AI.

## Architecture

```
packages/
├── core/       @vibeonrails/core   — API (Hono + tRPC), Database (Drizzle), Security (JWT + Argon2)
├── infra/      @vibeonrails/infra  — Health, Logging, Queue (BullMQ), Email (Resend), Cache, Storage
└── cli/        @vibeonrails/cli    — CLI: create projects, generate modules, dev/build/db commands
```

## Tech Stack

| Layer          | Technology          | Rationale                    |
|----------------|---------------------|------------------------------|
| Runtime        | Node.js 22+         | Maximum compatibility        |
| Package Manager| pnpm                | Best monorepo support        |
| Monorepo       | Turborepo           | Fast builds, caching         |
| HTTP Server    | Hono                | Fast, edge-ready             |
| API Layer      | tRPC                | End-to-end type safety       |
| Database       | Drizzle ORM         | Type-safe SQL                |
| Validation     | Zod                 | Industry standard            |
| Auth           | jose + Argon2       | JWT + password hashing       |
| Queue          | BullMQ              | Mature, Redis-based          |
| Email          | Resend              | Modern API                   |

## Quick Start

```bash
# Create a new project
npx create-vibe my-app
cd my-app

# Configure environment
cp .env.example .env

# Start developing
pnpm run dev
```

### Generate a Module

```bash
# Generate a full module (types, service, controller, test)
npx vibe generate module user
npx vibe generate module blog-post
```

## Getting Started (Monorepo Development)

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL
- Redis (for queue/cache)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment config
cp .env.example .env

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Type check + lint + test + build
pnpm run validate
```

### Project Structure

Each package follows the same convention:

```
packages/{name}/
├── src/              # Source code
│   ├── {module}/     # Feature module
│   │   ├── *.ts      # Implementation
│   │   ├── *.test.ts # Colocated tests
│   │   └── index.ts  # Barrel export
│   └── index.ts      # Package entry
├── SKILL.md          # AI skill document
├── package.json
├── tsconfig.json
└── tsup.config.ts    # Build config
```

## Packages

### @vibeonrails/core

The core package provides:

- **API** — `createServer()`, `router()`, `publicProcedure`, `protectedProcedure`
- **Database** — `createDatabase()`, Drizzle schema definitions, migration runner
- **Security** — `signAccessToken()`, `verifyToken()`, `hashPassword()`, `verifyPassword()`, `requireRole()`, `requireOwnership()`
- **Shared** — `AppError`, `NotFoundError`, `ValidationError`, utility functions

```typescript
import { createServer, router, protectedProcedure } from '@vibeonrails/core/api';
import { createDatabase } from '@vibeonrails/core/database';
import { signAccessToken, hashPassword } from '@vibeonrails/core/security';
```

### @vibeonrails/infra

The infrastructure package provides:

- **Health** — `registerHealthCheck()`, `runHealthChecks()`
- **Logging** — `logger.info()`, `logger.child()`
- **Queue** — `defineJob()`, `enqueue()`
- **Email** — `sendEmail()` with Markdown templates
- **Cache** — `createCache()` with Redis
- **Storage** — `createStorage()` with S3

```typescript
import { registerHealthCheck } from '@vibeonrails/infra/health';
import { logger } from '@vibeonrails/infra/logging';
import { defineJob, enqueue } from '@vibeonrails/infra/queue';
import { sendEmail } from '@vibeonrails/infra/email';
```

### @vibeonrails/cli

The CLI that makes the framework usable:

- **`vibe create <name>`** — Scaffold a new project from the app template
- **`vibe generate module <name>`** — Generate module with types, service, controller, test
- **`vibe dev`** — Start development server with hot reload
- **`vibe db migrate|seed|reset|studio`** — Database operations
- **`vibe build`** — Production build

```bash
npx create-vibe my-app
npx vibe generate module user
npx vibe dev
```

## Development

```bash
# Build all packages
pnpm run build

# Run all tests
pnpm run test

# Type check all packages
pnpm run typecheck

# Lint all packages
pnpm run lint

# Full validation (typecheck + lint + test + build)
pnpm run validate
```

## License

MIT
