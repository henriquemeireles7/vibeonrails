# Getting Started

Get a Vibe on Rails project up and running in under five minutes.

---

## Prerequisites

Before you begin, make sure you have the following installed:

| Tool | Version | Purpose |
|------|---------|---------|
| **Node.js** | 22+ | JavaScript runtime |
| **pnpm** | 9+ | Package manager |
| **PostgreSQL** | 15+ | Database (or use Docker) |
| **Redis** | 7+ | Queue and cache (optional) |

Install pnpm if you don't have it:

```bash
corepack enable
corepack prepare pnpm@latest --activate
```

---

## Create a New Project

Use the `create-vibe` CLI to scaffold a new project:

```bash
npx create-vibe my-app
```

You'll be prompted to choose a template:

- **basic** — Minimal API server with authentication
- **saas** — Full SaaS starter with payments, admin panel, email, and queue

```bash
npx create-vibe my-app --template saas
```

Once complete, navigate into your project:

```bash
cd my-app
pnpm install
```

---

## Project Structure

A freshly scaffolded Vibe on Rails project looks like this:

```
my-app/
├── src/
│   ├── config/
│   │   ├── app.config.ts      # App-level configuration
│   │   └── database.config.ts # Database connection settings
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.types.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.test.ts
│   │   │   └── index.ts
│   │   ├── user/
│   │   │   ├── user.types.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.test.ts
│   │   │   └── index.ts
│   │   └── post/
│   │       ├── post.types.ts
│   │       ├── post.service.ts
│   │       ├── post.controller.ts
│   │       ├── post.test.ts
│   │       └── index.ts
│   ├── router.ts              # Merges all module routers
│   └── main.ts                # Entry point
├── drizzle/                   # Database migrations
├── seeds/                     # Seed data
├── .env                       # Environment variables
├── drizzle.config.ts          # Drizzle Kit config
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

**Key conventions:**

- Each feature lives in `src/modules/<name>/`
- Every module has the same file structure: types, service, controller, test, index
- The `router.ts` file merges all module routers into one tRPC router
- The `main.ts` file creates the server and starts listening

---

## Configure Environment

Copy the example environment file and fill in your values:

```bash
cp .env.example .env
```

Essential environment variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/my_app

# Security
JWT_SECRET=your-secret-key-at-least-32-chars
JWT_ISSUER=my-app

# Redis (optional — for queue and cache)
REDIS_URL=redis://localhost:6379
```

---

## Set Up the Database

Create the database and run migrations:

```bash
# Create the database (if it doesn't exist)
createdb my_app

# Run migrations
pnpm vibe db:migrate

# Seed development data
pnpm vibe db:seed
```

Or use Docker for a quick PostgreSQL setup:

```bash
docker run -d \
  --name my-app-db \
  -e POSTGRES_DB=my_app \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16
```

---

## Start the Dev Server

```bash
pnpm dev
```

Your API server is now running at `http://localhost:3000`. Try it out:

```bash
# Health check
curl http://localhost:3000/health

# Response:
# { "status": "ok", "timestamp": "2026-02-05T...", "version": "0.1.0" }
```

The tRPC API is available at `http://localhost:3000/trpc`. Use a tRPC client or tools like Thunder Client to test your endpoints.

---

## Generate a New Module

Use the CLI to scaffold a new module:

```bash
pnpm vibe generate module todo
```

This creates the complete module structure:

```
src/modules/todo/
├── todo.types.ts       # Zod schemas and TypeScript types
├── todo.service.ts     # Business logic
├── todo.controller.ts  # tRPC router with procedures
├── todo.test.ts        # Vitest tests
├── index.ts            # Barrel export
└── SKILL.md            # AI agent documentation
```

Register the new module in your router:

```typescript
// src/router.ts
import { createAppRouter } from '@vibeonrails/core/api';
import { authRouter } from './modules/auth';
import { userRouter } from './modules/user';
import { postRouter } from './modules/post';
import { todoRouter } from './modules/todo';

export const appRouter = createAppRouter({
  auth: authRouter,
  user: userRouter,
  post: postRouter,
  todo: todoRouter,
});

export type AppRouter = typeof appRouter;
```

---

## Run Tests

Vibe on Rails uses Vitest for testing. Run your test suite:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run tests for a specific module
pnpm test -- --filter todo
```

---

## Build for Production

```bash
pnpm build
```

This compiles your TypeScript to optimized JavaScript in the `dist/` directory. To start the production server:

```bash
pnpm start
```

---

## Deploy

Vibe on Rails apps can be deployed to any Node.js hosting platform. See the [Deploy to Production](./tutorials/deploy) tutorial for guides on:

- **Railway** — One-click deployment
- **Fly.io** — Edge deployment with `fly launch`
- **Docker** — Container-based deployment

---

## Next Steps

- [Core API Reference](./core/api) — Deep dive into the API layer
- [Create Your First Module](./tutorials/first-module) — Step-by-step module tutorial
- [Add Authentication](./tutorials/authentication) — Set up JWT, sessions, and OAuth
- [Infrastructure](./infra/overview) — Add logging, queues, email, and more
