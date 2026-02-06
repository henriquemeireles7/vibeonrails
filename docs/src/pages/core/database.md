# Core: Database

The `@vibeonrails/core/database` module provides a type-safe database layer built on **Drizzle ORM** with PostgreSQL. It includes database client creation, schema definition helpers, migrations, seeds, and a repository pattern for common queries.

---

## Installation

```bash
pnpm add @vibeonrails/core
```

```typescript
import {
  createDatabase,
  runMigrations,
  runSeeds,
  seedDevelopment,
  seedTest,
} from "@vibeonrails/core/database";
```

---

## Database Client

### `createDatabase(url)`

Creates a connected Drizzle database client from a PostgreSQL connection string.

```typescript
import { createDatabase } from "@vibeonrails/core/database";

const db = createDatabase(process.env.DATABASE_URL!);
```

The returned `Database` type is a fully typed Drizzle client you can use for queries:

```typescript
import { eq } from "drizzle-orm";
import { users } from "./schema";

const user = await db.query.users.findFirst({
  where: eq(users.email, "hello@example.com"),
});
```

#### Type

```typescript
type Database = ReturnType<typeof createDatabase>;
```

You can pass this type around your application for dependency injection:

```typescript
export function createUserService(db: Database) {
  return {
    findById: (id: string) =>
      db.query.users.findFirst({ where: eq(users.id, id) }),
  };
}
```

---

## Schema Definition

Define your database schema using Drizzle's type-safe schema builder. Place schema files in `src/config/` or colocate them with modules.

### Tables

```typescript
// src/config/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 50 }).notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  published: boolean("published").notNull().default(false),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

### Relations

Define relations for type-safe joins:

```typescript
import { relations } from "drizzle-orm";

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

### Inferred Types

Drizzle lets you infer TypeScript types directly from your schema:

```typescript
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";

export type User = InferSelectModel<typeof users>;
export type NewUser = InferInsertModel<typeof users>;
export type Post = InferSelectModel<typeof posts>;
export type NewPost = InferInsertModel<typeof posts>;
```

---

## Migrations

Vibe on Rails uses Drizzle Kit for schema migrations.

### Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/config/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Generate Migrations

```bash
# Generate a migration from schema changes
pnpm vibe db:migrate

# Or using Drizzle Kit directly
npx drizzle-kit generate
```

This creates a SQL migration file in `drizzle/`:

```
drizzle/
├── 0000_initial.sql
├── 0001_add_posts_table.sql
└── meta/
    └── _journal.json
```

### Run Migrations

```typescript
import { runMigrations } from "@vibeonrails/core/database";

// Run all pending migrations
await runMigrations(db);
```

Or via the CLI:

```bash
pnpm vibe db:migrate
```

### Push (Development)

For rapid iteration in development, push schema changes directly without generating migration files:

```bash
npx drizzle-kit push
```

> **Warning**: Only use `push` in development. Always use proper migrations in production.

---

## Seeds

### `runSeeds(db, environment)`

Run seed data for the specified environment.

```typescript
import { runSeeds } from "@vibeonrails/core/database";

await runSeeds(db, "development");
```

### `seedDevelopment(db)`

Seeds the database with development data — sample users, posts, and other test content.

```typescript
import { seedDevelopment } from "@vibeonrails/core/database";

await seedDevelopment(db);
```

### `seedTest(db)`

Seeds the database with minimal test data for running automated tests.

```typescript
import { seedTest } from "@vibeonrails/core/database";

await seedTest(db);
```

### Custom Seeds

Create custom seed files for your modules:

```typescript
// seeds/users.seed.ts
import { hashPassword } from "@vibeonrails/core/security";
import { users } from "../src/config/schema";
import type { Database } from "@vibeonrails/core/database";

export async function seedUsers(db: Database) {
  const passwordHash = await hashPassword("password123");

  await db
    .insert(users)
    .values([
      {
        email: "admin@example.com",
        name: "Admin User",
        passwordHash,
        role: "admin",
      },
      {
        email: "user@example.com",
        name: "Regular User",
        passwordHash,
        role: "user",
      },
    ])
    .onConflictDoNothing();
}
```

---

## Repositories

The repository pattern provides reusable CRUD operations for your entities.

### Basic Repository

```typescript
import { eq, desc } from "drizzle-orm";
import type { Database } from "@vibeonrails/core/database";
import { users, type User, type NewUser } from "../config/schema";

export function createUserRepository(db: Database) {
  return {
    async findById(id: string): Promise<User | undefined> {
      return db.query.users.findFirst({
        where: eq(users.id, id),
      });
    },

    async findByEmail(email: string): Promise<User | undefined> {
      return db.query.users.findFirst({
        where: eq(users.email, email),
      });
    },

    async findAll(): Promise<User[]> {
      return db.query.users.findMany({
        orderBy: desc(users.createdAt),
      });
    },

    async create(data: NewUser): Promise<User> {
      const [user] = await db.insert(users).values(data).returning();
      return user;
    },

    async update(id: string, data: Partial<NewUser>): Promise<User> {
      const [user] = await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return user;
    },

    async delete(id: string): Promise<void> {
      await db.delete(users).where(eq(users.id, id));
    },
  };
}
```

### Repository with Relations

```typescript
export function createPostRepository(db: Database) {
  return {
    async findWithAuthor(id: string) {
      return db.query.posts.findFirst({
        where: eq(posts.id, id),
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });
    },

    async listPublished(limit = 20, offset = 0) {
      return db.query.posts.findMany({
        where: eq(posts.published, true),
        with: { author: true },
        orderBy: desc(posts.createdAt),
        limit,
        offset,
      });
    },
  };
}
```

---

## Querying

### Select Queries

```typescript
import { eq, and, like, desc, count } from "drizzle-orm";

// Find one
const user = await db.query.users.findFirst({
  where: eq(users.email, "admin@example.com"),
});

// Find many with conditions
const activeUsers = await db.query.users.findMany({
  where: and(eq(users.isActive, true), like(users.email, "%@company.com")),
  orderBy: desc(users.createdAt),
  limit: 50,
});

// Aggregate
const [{ total }] = await db
  .select({ total: count() })
  .from(users)
  .where(eq(users.isActive, true));
```

### Insert

```typescript
const [newUser] = await db
  .insert(users)
  .values({
    email: "new@example.com",
    name: "New User",
    passwordHash: await hashPassword("secret"),
  })
  .returning();
```

### Update

```typescript
const [updated] = await db
  .update(users)
  .set({ name: "Updated Name", updatedAt: new Date() })
  .where(eq(users.id, userId))
  .returning();
```

### Delete

```typescript
await db.delete(posts).where(eq(posts.authorId, userId));
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  const [user] = await tx.insert(users).values(userData).returning();
  await tx.insert(posts).values({
    title: "Welcome!",
    content: "Your first post.",
    authorId: user.id,
  });
});
```

---

## Drizzle Studio

Launch the Drizzle Studio database browser:

```bash
pnpm vibe db:studio
```

This opens a web-based GUI at `https://local.drizzle.studio` where you can browse tables, run queries, and inspect data.

---

## CLI Commands

| Command                | Description                                   |
| ---------------------- | --------------------------------------------- |
| `pnpm vibe db:migrate` | Generate and run migrations                   |
| `pnpm vibe db:seed`    | Run seed data                                 |
| `pnpm vibe db:reset`   | Drop all tables and re-run migrations + seeds |
| `pnpm vibe db:studio`  | Open Drizzle Studio GUI                       |
