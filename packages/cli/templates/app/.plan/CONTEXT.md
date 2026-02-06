# Technical Context

## Architecture

- **Modular monolith** — Single deployable with feature modules
- **tRPC router** — Type-safe API, no REST/GraphQL schema files
- **Service layer** — Business logic separated from HTTP concerns
- **Zod schemas** — Single source of truth for validation + types

## Constraints

<!-- List any technical constraints, e.g.: -->
<!-- - Must support PostgreSQL 15+ -->
<!-- - Deploy to Docker / Fly.io / Vercel -->
<!-- - Must work with Node.js 20+ -->

## Environment

- `NODE_ENV` — development | production | test
- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — Token signing secret (min 16 chars)

See `.env.example` for full list.

## Key Patterns

1. **Types → Service → Controller** — Always define types first
2. **Protected vs Public** — Use `protectedProcedure` for auth-required endpoints
3. **Config over env** — Import from `src/config/`, never from `process.env` directly
