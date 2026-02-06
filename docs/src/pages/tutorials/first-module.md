# Tutorial: Create Your First Module

In this tutorial, you'll build a **Todo** module from scratch — a complete CRUD feature with types, service, controller, and tests. By the end, you'll understand the module pattern that every Vibe on Rails feature follows.

---

## Prerequisites

- A Vibe on Rails project set up and running (see [Getting Started](../getting-started))
- Database configured and migrated

---

## Step 1: Generate the Module

Use the CLI to scaffold the module:

```bash
pnpm vibe generate module todo
```

This creates:

```
src/modules/todo/
├── todo.types.ts
├── todo.service.ts
├── todo.controller.ts
├── todo.test.ts
├── index.ts
└── SKILL.md
```

---

## Step 2: Define the Schema

Add the `todos` table to your database schema:

```typescript
// src/config/schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const todos = pgTable("todos", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  completed: boolean("completed").notNull().default(false),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

Generate and run the migration:

```bash
pnpm vibe db:migrate
```

---

## Step 3: Define Types

Open `src/modules/todo/todo.types.ts` and define Zod schemas and TypeScript types:

```typescript
// src/modules/todo/todo.types.ts
import { z } from "zod";
import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import { todos } from "../../config/schema";

// Database types
export type Todo = InferSelectModel<typeof todos>;
export type NewTodo = InferInsertModel<typeof todos>;

// Input validation schemas
export const createTodoSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
});

// Inferred input types
export type CreateTodoInput = z.infer<typeof createTodoSchema>;
export type UpdateTodoInput = z.infer<typeof updateTodoSchema>;
```

---

## Step 4: Implement the Service

The service contains all business logic. Open `src/modules/todo/todo.service.ts`:

```typescript
// src/modules/todo/todo.service.ts
import { eq, and, desc } from "drizzle-orm";
import { db } from "../../config/database.config";
import { todos } from "../../config/schema";
import { NotFoundError } from "@vibeonrails/core/shared";
import type { CreateTodoInput, UpdateTodoInput, Todo } from "./todo.types";

export async function listByUser(userId: string): Promise<Todo[]> {
  return db.query.todos.findMany({
    where: eq(todos.userId, userId),
    orderBy: desc(todos.createdAt),
  });
}

export async function getById(id: string, userId: string): Promise<Todo> {
  const todo = await db.query.todos.findFirst({
    where: and(eq(todos.id, id), eq(todos.userId, userId)),
  });

  if (!todo) {
    throw new NotFoundError(`Todo ${id} not found`);
  }

  return todo;
}

export async function create(
  userId: string,
  input: CreateTodoInput,
): Promise<Todo> {
  const [todo] = await db
    .insert(todos)
    .values({
      ...input,
      userId,
    })
    .returning();

  return todo;
}

export async function update(
  id: string,
  userId: string,
  input: UpdateTodoInput,
): Promise<Todo> {
  // Verify ownership
  await getById(id, userId);

  const [todo] = await db
    .update(todos)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .returning();

  return todo;
}

export async function remove(id: string, userId: string): Promise<void> {
  // Verify ownership
  await getById(id, userId);

  await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, userId)));
}

export async function toggleComplete(
  id: string,
  userId: string,
): Promise<Todo> {
  const todo = await getById(id, userId);

  const [updated] = await db
    .update(todos)
    .set({
      completed: !todo.completed,
      updatedAt: new Date(),
    })
    .where(eq(todos.id, id))
    .returning();

  return updated;
}
```

---

## Step 5: Build the Controller

The controller maps tRPC procedures to service functions. Open `src/modules/todo/todo.controller.ts`:

```typescript
// src/modules/todo/todo.controller.ts
import { router, protectedProcedure } from "@vibeonrails/core/api";
import { z } from "zod";
import { createTodoSchema, updateTodoSchema } from "./todo.types";
import * as todoService from "./todo.service";

export const todoRouter = router({
  /** List all todos for the authenticated user */
  list: protectedProcedure.query(({ ctx }) => {
    return todoService.listByUser(ctx.user.id);
  }),

  /** Get a single todo by ID */
  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ ctx, input }) => {
      return todoService.getById(input.id, ctx.user.id);
    }),

  /** Create a new todo */
  create: protectedProcedure
    .input(createTodoSchema)
    .mutation(({ ctx, input }) => {
      return todoService.create(ctx.user.id, input);
    }),

  /** Update an existing todo */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        data: updateTodoSchema,
      }),
    )
    .mutation(({ ctx, input }) => {
      return todoService.update(input.id, ctx.user.id, input.data);
    }),

  /** Delete a todo */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      return todoService.remove(input.id, ctx.user.id);
    }),

  /** Toggle completed status */
  toggleComplete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => {
      return todoService.toggleComplete(input.id, ctx.user.id);
    }),
});
```

---

## Step 6: Set Up the Barrel Export

Open `src/modules/todo/index.ts`:

```typescript
// src/modules/todo/index.ts
export { todoRouter } from "./todo.controller";
export type { Todo, CreateTodoInput, UpdateTodoInput } from "./todo.types";
```

---

## Step 7: Register the Router

Add the todo router to your main application router:

```typescript
// src/router.ts
import { createAppRouter } from "@vibeonrails/core/api";
import { authRouter } from "./modules/auth";
import { userRouter } from "./modules/user";
import { postRouter } from "./modules/post";
import { todoRouter } from "./modules/todo";

export const appRouter = createAppRouter({
  auth: authRouter,
  user: userRouter,
  post: postRouter,
  todo: todoRouter, // <-- Add this line
});

export type AppRouter = typeof appRouter;
```

---

## Step 8: Write Tests

Open `src/modules/todo/todo.test.ts` and add tests:

```typescript
// src/modules/todo/todo.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import * as todoService from "./todo.service";

const TEST_USER_ID = "test-user-id";

describe("Todo Service", () => {
  describe("create", () => {
    it("should create a todo with title and description", async () => {
      const todo = await todoService.create(TEST_USER_ID, {
        title: "Buy groceries",
        description: "Milk, eggs, bread",
      });

      expect(todo).toBeDefined();
      expect(todo.title).toBe("Buy groceries");
      expect(todo.description).toBe("Milk, eggs, bread");
      expect(todo.completed).toBe(false);
      expect(todo.userId).toBe(TEST_USER_ID);
    });

    it("should create a todo without description", async () => {
      const todo = await todoService.create(TEST_USER_ID, {
        title: "Simple task",
      });

      expect(todo.title).toBe("Simple task");
      expect(todo.description).toBeNull();
    });
  });

  describe("listByUser", () => {
    it("should return todos for the specified user", async () => {
      await todoService.create(TEST_USER_ID, { title: "Task 1" });
      await todoService.create(TEST_USER_ID, { title: "Task 2" });

      const todos = await todoService.listByUser(TEST_USER_ID);

      expect(todos).toHaveLength(2);
      expect(todos[0].title).toBe("Task 2"); // Most recent first
    });

    it("should not return todos from other users", async () => {
      await todoService.create("other-user", { title: "Other task" });
      const todos = await todoService.listByUser(TEST_USER_ID);

      expect(todos.every((t) => t.userId === TEST_USER_ID)).toBe(true);
    });
  });

  describe("toggleComplete", () => {
    it("should toggle completed status", async () => {
      const todo = await todoService.create(TEST_USER_ID, {
        title: "Toggle me",
      });

      expect(todo.completed).toBe(false);

      const toggled = await todoService.toggleComplete(todo.id, TEST_USER_ID);
      expect(toggled.completed).toBe(true);

      const toggledBack = await todoService.toggleComplete(
        todo.id,
        TEST_USER_ID,
      );
      expect(toggledBack.completed).toBe(false);
    });
  });

  describe("remove", () => {
    it("should delete a todo", async () => {
      const todo = await todoService.create(TEST_USER_ID, {
        title: "Delete me",
      });
      await todoService.remove(todo.id, TEST_USER_ID);

      await expect(todoService.getById(todo.id, TEST_USER_ID)).rejects.toThrow(
        "not found",
      );
    });
  });
});
```

Run the tests:

```bash
pnpm test -- --filter todo
```

---

## Step 9: Test the API

Start the dev server and test your new endpoints:

```bash
pnpm dev
```

### Create a Todo

```bash
curl -X POST http://localhost:3000/trpc/todo.create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title": "Learn Vibe on Rails", "description": "Build amazing apps"}'
```

### List Todos

```bash
curl http://localhost:3000/trpc/todo.list \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Summary

You've built a complete Todo module following the Vibe on Rails pattern:

1. **Types** (`todo.types.ts`) — Zod schemas + TypeScript types
2. **Service** (`todo.service.ts`) — Business logic, database queries
3. **Controller** (`todo.controller.ts`) — tRPC router with procedures
4. **Test** (`todo.test.ts`) — Vitest tests for the service
5. **Index** (`index.ts`) — Barrel export
6. **Router** (`router.ts`) — Registered in the app router

This same pattern applies to every feature in your application. The consistency makes it easy for both humans and AI agents to navigate and extend the codebase.

---

## Next Steps

- [Add Authentication](./authentication) — Protect your routes with JWT
- [Core API Reference](../core/api) — Deep dive into tRPC procedures and middleware
- [Infrastructure](../infra/overview) — Add caching, email notifications, and more
