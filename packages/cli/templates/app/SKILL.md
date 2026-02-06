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

## Pitfalls

1. **Always validate env** — Never use `process.env` directly; use `src/config/env.ts`
2. **Keep services DB-agnostic** — Business logic should not import Drizzle directly
3. **Protected routes** — Use `protectedProcedure` for authenticated endpoints
