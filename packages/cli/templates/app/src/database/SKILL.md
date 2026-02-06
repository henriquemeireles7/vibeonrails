# Database — Schema, Migrations & Seeds

## Setup

Database configuration lives in `src/config/database.ts`. Connection string comes from `DATABASE_URL` environment variable.

## Schema

Define your database schema using Drizzle ORM in `src/database/schema/`.

```typescript
// src/database/schema/users.ts
import { pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

## Commands

| Command | What it does |
|---------|-------------|
| `npm run db:migrate` | Push schema changes to database |
| `npm run db:seed` | Run development seed |
| `npm run db:studio` | Open Drizzle Studio GUI |

## Seeds

- `seeds/development.ts` — Sample admin, users, posts for local dev
- `seeds/test.ts` — Minimal fixtures for test suites
- `seeds/index.ts` — Runner that picks seed by NODE_ENV

## Pitfalls

1. **Never import `db` in services directly** — Pass it as a parameter or use dependency injection
2. **Always use migrations** — Don't modify the database manually
3. **Seed data uses deterministic IDs** — So tests and dev can reference known records
