# Core: API Reference

The `@vibeonrails/core/api` module provides the HTTP server layer built on **Hono** and **tRPC**. It gives you a type-safe API with automatic request validation, authentication context, and production-ready middleware.

---

## Installation

```bash
pnpm add @vibeonrails/core
```

```typescript
import {
  createServer,
  createAppRouter,
  router,
  publicProcedure,
  protectedProcedure,
  middleware,
  createContext,
  errorHandler,
  rateLimit,
} from "@vibeonrails/core/api";
```

---

## Server Creation

### `createServer(options)`

Creates a fully configured Hono HTTP server with built-in middleware for CORS, secure headers, request logging, error handling, and tRPC integration.

```typescript
import { createServer } from "@vibeonrails/core/api";
import { appRouter } from "./router";

const app = createServer({
  router: appRouter,
  trpcPath: "/trpc", // default: '/trpc'
  corsOrigin: "https://myapp.com", // default: allow all origins
});

export default {
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch,
};
```

#### `ServerOptions`

| Option       | Type                 | Default     | Description                  |
| ------------ | -------------------- | ----------- | ---------------------------- |
| `router`     | `AnyRouter`          | _required_  | The tRPC router to serve     |
| `trpcPath`   | `string`             | `'/trpc'`   | Base path for tRPC endpoints |
| `corsOrigin` | `string \| string[]` | all origins | Allowed CORS origins         |

The server automatically includes:

- **CORS** middleware with configurable origins
- **Secure headers** (X-Content-Type-Options, X-Frame-Options, etc.)
- **Request logging** in development
- **Error handling** middleware
- **Health check** endpoint at `GET /health`
- **tRPC** integration at the configured path

---

## tRPC Router

### `router(routes)`

Creates a new tRPC router. This is a re-export of the tRPC `router` function, pre-configured with the Vibe on Rails context type.

```typescript
import { router, publicProcedure } from "@vibeonrails/core/api";
import { z } from "zod";

export const postRouter = router({
  list: publicProcedure.query(async () => {
    // Return all posts
    return await getAllPosts();
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await createPost({
        ...input,
        authorId: ctx.user.id,
      });
    }),
});
```

### `createAppRouter(routes)`

Merges multiple feature routers into a single application router. This is the top-level router that gets passed to `createServer`.

```typescript
import { createAppRouter } from "@vibeonrails/core/api";
import { authRouter } from "./modules/auth";
import { userRouter } from "./modules/user";
import { postRouter } from "./modules/post";

export const appRouter = createAppRouter({
  auth: authRouter,
  user: userRouter,
  post: postRouter,
});

// Export the type for client-side usage
export type AppRouter = typeof appRouter;
```

---

## Procedures

Procedures are the tRPC equivalent of API endpoints. Vibe on Rails provides two built-in procedure types:

### `publicProcedure`

No authentication required. Anyone can call these endpoints.

```typescript
import { publicProcedure } from "@vibeonrails/core/api";
import { z } from "zod";

export const healthRouter = router({
  ping: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),

  echo: publicProcedure
    .input(z.object({ message: z.string() }))
    .query(({ input }) => {
      return { echo: input.message };
    }),
});
```

### `protectedProcedure`

Requires a valid JWT Bearer token in the Authorization header. The authenticated user is available on `ctx.user`.

```typescript
import { protectedProcedure } from "@vibeonrails/core/api";
import { z } from "zod";

export const profileRouter = router({
  me: protectedProcedure.query(({ ctx }) => {
    // ctx.user is guaranteed to be non-null
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      role: ctx.user.role,
    };
  }),

  updateEmail: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      return await updateUserEmail(ctx.user.id, input.email);
    }),
});
```

If no valid token is provided, `protectedProcedure` automatically returns an `UNAUTHORIZED` error:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required. Include a valid Bearer token in the Authorization header."
  }
}
```

---

## Context

### `createContext(opts)`

Automatically called for every tRPC request. Extracts the JWT from the `Authorization` header and populates the context with the authenticated user.

```typescript
// Automatic — you don't usually call this directly.
// The context is created by createServer and passed to every procedure.

// Context type:
interface Context {
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
}
```

The context flow:

1. Request arrives with `Authorization: Bearer <token>` header
2. `createContext` extracts and verifies the JWT
3. On success, `ctx.user` is populated with the token payload
4. On failure (invalid/expired token), `ctx.user` is `null`

---

## Custom Middleware

### `middleware(fn)`

Create custom tRPC middleware for cross-cutting concerns like logging, permission checks, or data enrichment.

```typescript
import { middleware, protectedProcedure } from "@vibeonrails/core/api";

// Logging middleware
const logMiddleware = middleware(async ({ ctx, next, path }) => {
  const start = Date.now();
  const result = await next({ ctx });
  const duration = Date.now() - start;
  console.log(`[${path}] ${duration}ms`);
  return result;
});

// Admin-only middleware
const adminMiddleware = middleware(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required.",
    });
  }
  return next({ ctx });
});

// Compose into a procedure
const adminProcedure = protectedProcedure
  .use(logMiddleware)
  .use(adminMiddleware);

// Use in a router
export const adminRouter = router({
  listUsers: adminProcedure.query(async () => {
    return await getAllUsers();
  }),
});
```

---

## Rate Limiting

### `rateLimit(options)`

In-memory rate limiter middleware for Hono. Limits requests per IP address within a configurable time window.

```typescript
import { rateLimit } from "@vibeonrails/core/api";

// Apply to the entire server
app.use("*", rateLimit({ max: 100, windowMs: 60_000 }));

// Apply to specific routes
app.use("/trpc/auth.*", rateLimit({ max: 10, windowMs: 60_000 }));
```

#### Options

| Option     | Type     | Default    | Description                        |
| ---------- | -------- | ---------- | ---------------------------------- |
| `max`      | `number` | _required_ | Maximum requests within the window |
| `windowMs` | `number` | `60000`    | Time window in milliseconds        |

#### Response Headers

Every response includes rate limit headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 97
```

When the limit is exceeded, a `429 Too Many Requests` response is returned:

```json
{
  "code": "E6001",
  "message": "Rate limit exceeded. Try again in 45 seconds.",
  "docs": "https://vibeonrails.dev/errors/E6001"
}
```

> **Production note**: The built-in rate limiter uses in-memory storage. For multi-instance deployments, use a Redis-based rate limiter.

---

## Error Handling

### `errorHandler()`

Global error handling middleware that catches errors and returns structured JSON responses. Automatically included by `createServer`.

Errors include a `docs` link for debugging:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Validation failed",
    "data": {
      "docs": "https://vibeonrails.dev/errors/BAD_REQUEST"
    }
  }
}
```

### Custom Error Classes

Use the built-in error classes from `@vibeonrails/core/shared`:

```typescript
import {
  NotFoundError,
  ValidationError,
  ForbiddenError,
} from "@vibeonrails/core/shared";

// In a service
export async function getUser(id: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) });
  if (!user) {
    throw new NotFoundError(`User ${id} not found`);
  }
  return user;
}
```

---

## Full Example

Here's a complete minimal server setup:

```typescript
// src/main.ts
import { createServer } from "@vibeonrails/core/api";
import { appRouter } from "./router";

const app = createServer({
  router: appRouter,
  corsOrigin: process.env.CORS_ORIGIN,
});

export default {
  port: Number(process.env.PORT) || 3000,
  fetch: app.fetch,
};
```

```typescript
// src/router.ts
import { createAppRouter } from "@vibeonrails/core/api";
import { authRouter } from "./modules/auth";
import { userRouter } from "./modules/user";
import { postRouter } from "./modules/post";

export const appRouter = createAppRouter({
  auth: authRouter,
  user: userRouter,
  post: postRouter,
});

export type AppRouter = typeof appRouter;
```

```typescript
// src/modules/post/post.controller.ts
import {
  router,
  publicProcedure,
  protectedProcedure,
} from "@vibeonrails/core/api";
import { z } from "zod";
import { createPost, listPosts, getPost, deletePost } from "./post.service";

export const postRouter = router({
  list: publicProcedure.query(() => listPosts()),

  get: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => getPost(input.id)),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1),
      }),
    )
    .mutation(({ ctx, input }) =>
      createPost({ ...input, authorId: ctx.user.id }),
    ),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ ctx, input }) => deletePost(input.id, ctx.user.id)),
});
```
