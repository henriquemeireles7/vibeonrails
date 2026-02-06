# CLI Commands

The `@vibeonrails/cli` package provides command-line tools for project scaffolding, code generation, development workflow, database management, building, and deployment.

---

## Installation

The CLI is available as two commands:

- **`create-vibe`** — Scaffold a new Vibe on Rails project (use via `npx`)
- **`vibe`** — Project commands (available after `pnpm install` in a Vibe on Rails project)

```bash
# Global (optional)
pnpm add -g @vibeonrails/cli

# Via npx (no install required)
npx create-vibe my-app
```

---

## `create-vibe` — Create a New Project

Scaffolds a complete Vibe on Rails project with all the boilerplate set up.

```bash
npx create-vibe <project-name> [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<project-name>` | Name of the project directory to create |

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--template <name>` | `basic` | Project template (`basic` or `saas`) |
| `--skip-install` | `false` | Skip `pnpm install` after scaffolding |
| `--skip-git` | `false` | Skip `git init` |

### Templates

#### `basic`

A minimal API server with authentication:

```
my-app/
├── src/
│   ├── config/
│   │   ├── app.config.ts
│   │   └── database.config.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── user/
│   │   └── post/
│   ├── router.ts
│   └── main.ts
├── drizzle/
├── .env.example
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

#### `saas`

A full SaaS starter with payments, admin panel, email, queue, and more:

```
my-saas/
├── src/
│   ├── config/
│   ├── modules/
│   │   ├── auth/
│   │   ├── user/
│   │   ├── post/
│   │   ├── billing/
│   │   └── admin/
│   ├── jobs/
│   │   ├── send-email.job.ts
│   │   └── process-payment.job.ts
│   ├── emails/
│   │   ├── welcome.md
│   │   └── password-reset.md
│   ├── router.ts
│   └── main.ts
├── drizzle/
├── seeds/
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

### Example

```bash
# Basic project
npx create-vibe my-app

# SaaS project
npx create-vibe my-saas --template saas

# Skip auto-install
npx create-vibe my-app --skip-install
```

After scaffolding:

```bash
cd my-app
cp .env.example .env
# Edit .env with your database URL and secrets
pnpm dev
```

---

## `vibe generate` — Code Generation

Generate boilerplate code for modules and components.

### `vibe generate module <name>`

Generates a complete backend module with types, service, controller, test, and index files.

```bash
pnpm vibe generate module todo
```

Creates:

```
src/modules/todo/
├── todo.types.ts       # Zod schemas and TypeScript types
├── todo.service.ts     # Business logic functions
├── todo.controller.ts  # tRPC router with procedures
├── todo.test.ts        # Vitest test file with example tests
├── index.ts            # Barrel export
└── SKILL.md            # AI agent documentation
```

#### Generated `todo.types.ts`

```typescript
import { z } from 'zod';

export const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
});

export const updateTodoSchema = createTodoSchema.partial();

export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
```

#### Generated `todo.controller.ts`

```typescript
import { router, publicProcedure, protectedProcedure } from '@vibeonrails/core/api';
import { z } from 'zod';
import { createTodoSchema, updateTodoSchema } from './todo.types';
import * as todoService from './todo.service';

export const todoRouter = router({
  list: publicProcedure.query(() => todoService.list()),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => todoService.get(input.id)),

  create: protectedProcedure
    .input(createTodoSchema)
    .mutation(({ ctx, input }) => todoService.create(ctx.user.id, input)),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: updateTodoSchema }))
    .mutation(({ input }) => todoService.update(input.id, input.data)),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => todoService.remove(input.id)),
});
```

After generating, register the router in `src/router.ts`:

```typescript
import { todoRouter } from './modules/todo';

export const appRouter = createAppRouter({
  // ...existing routes
  todo: todoRouter,
});
```

### `vibe generate component <name>`

Generates a React component with TypeScript props.

```bash
pnpm vibe generate component UserCard
```

Creates:

```
src/components/UserCard/
├── UserCard.tsx
├── UserCard.test.tsx
└── index.ts
```

---

## `vibe dev` — Development Server

Starts the development server with hot reload.

```bash
pnpm vibe dev
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--port <number>` | `3000` | Port to listen on |
| `--host <string>` | `localhost` | Host to bind to |

### What It Does

1. Starts the Hono HTTP server
2. Watches for file changes
3. Automatically restarts on changes
4. Outputs structured logs to the console

```bash
$ pnpm vibe dev
  Server started on http://localhost:3000
  Watching for changes...
```

---

## `vibe db` — Database Commands

Manage your database schema, migrations, and seed data.

### `vibe db:migrate`

Generate migration files from schema changes and apply them.

```bash
pnpm vibe db:migrate
```

This command:
1. Compares your Drizzle schema to the current database state
2. Generates a SQL migration file in `drizzle/`
3. Applies the migration to the database

### `vibe db:seed`

Run seed data for the current environment.

```bash
pnpm vibe db:seed
```

Runs `seedDevelopment()` by default. Use `NODE_ENV=test pnpm vibe db:seed` for test seeds.

### `vibe db:reset`

Drop all tables and re-run migrations and seeds. **Destructive operation**.

```bash
pnpm vibe db:reset
```

This command:
1. Drops all tables in the database
2. Runs all migrations from scratch
3. Runs seed data

> **Warning**: This permanently deletes all data. Only use in development.

### `vibe db:studio`

Opens the Drizzle Studio database browser.

```bash
pnpm vibe db:studio
```

Opens a web-based GUI at `https://local.drizzle.studio` for browsing and editing data.

---

## `vibe build` — Production Build

Compiles TypeScript to optimized JavaScript for production.

```bash
pnpm vibe build
```

### What It Does

1. Type-checks the entire project
2. Compiles TypeScript with `tsup`
3. Outputs to `dist/`
4. Tree-shakes unused code

The output is ready to run with `node dist/main.js` or via the `start` script.

---

## `vibe deploy` — Deploy to Production

Deploy your application to a hosting platform.

```bash
pnpm vibe deploy [platform]
```

### Supported Platforms

| Platform | Command | Description |
|----------|---------|-------------|
| Railway | `pnpm vibe deploy railway` | Deploy to Railway with auto-detection |
| Fly.io | `pnpm vibe deploy fly` | Deploy to Fly.io with Dockerfile |
| Docker | `pnpm vibe deploy docker` | Build a Docker image |

### Railway

```bash
pnpm vibe deploy railway
```

Prerequisites:
- Railway CLI installed (`npm i -g @railway/cli`)
- Logged in (`railway login`)

This command:
1. Links your project (if not already linked)
2. Pushes your code to Railway
3. Railway auto-detects Node.js and builds

### Fly.io

```bash
pnpm vibe deploy fly
```

Prerequisites:
- Fly CLI installed (`curl -L https://fly.io/install.sh | sh`)
- Logged in (`fly auth login`)

This command:
1. Runs `fly launch` (first time) or `fly deploy`
2. Uses the Dockerfile in your project root
3. Sets up PostgreSQL and Redis on Fly.io

### Docker

```bash
pnpm vibe deploy docker
```

Builds a production Docker image:

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/main.js"]
```

---

## Command Reference

| Command | Description |
|---------|-------------|
| `npx create-vibe <name>` | Create a new project |
| `pnpm vibe generate module <name>` | Generate a backend module |
| `pnpm vibe generate component <name>` | Generate a React component |
| `pnpm vibe dev` | Start development server |
| `pnpm vibe db:migrate` | Run database migrations |
| `pnpm vibe db:seed` | Seed database |
| `pnpm vibe db:reset` | Reset database (drop + migrate + seed) |
| `pnpm vibe db:studio` | Open Drizzle Studio |
| `pnpm vibe build` | Build for production |
| `pnpm vibe deploy railway` | Deploy to Railway |
| `pnpm vibe deploy fly` | Deploy to Fly.io |
| `pnpm vibe deploy docker` | Build Docker image |
