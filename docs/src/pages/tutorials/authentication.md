# Tutorial: Add Authentication

In this tutorial, you'll implement a complete authentication system for your Vibe on Rails application — JWT access/refresh tokens, password-based login, session management, and OAuth with Google. By the end, you'll have production-ready auth that covers the most common use cases.

---

## Prerequisites

- A Vibe on Rails project set up and running (see [Getting Started](../getting-started))
- Database configured with the `users` table
- `JWT_SECRET` set in your `.env` file (minimum 32 characters)

---

## What You'll Build

1. **Registration** — Create accounts with email + password
2. **Login** — Authenticate and receive JWT tokens
3. **Token Refresh** — Rotate expired access tokens
4. **Protected Routes** — Restrict endpoints to authenticated users
5. **Role-Based Access** — Admin-only endpoints
6. **OAuth** — Sign in with Google
7. **Sessions** — Server-side session alternative

---

## Step 1: Set Up Environment Variables

Add the following to your `.env`:

```env
# JWT
JWT_SECRET=your-very-long-secret-key-at-least-32-characters
JWT_ISSUER=my-app

# OAuth (optional — for Google sign-in)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

---

## Step 2: Create the Auth Module

If you haven't already generated an auth module:

```bash
pnpm vibe generate module auth
```

---

## Step 3: Define Auth Types

```typescript
// src/modules/auth/auth.types.ts
import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required").max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
```

---

## Step 4: Implement the Auth Service

```typescript
// src/modules/auth/auth.service.ts
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyToken,
} from "@vibeonrails/core/security";
import { NotFoundError, ValidationError } from "@vibeonrails/core/shared";
import { db } from "../../config/database.config";
import { users } from "../../config/schema";
import { eq } from "drizzle-orm";
import type { RegisterInput, LoginInput } from "./auth.types";

export async function register(input: RegisterInput) {
  // Check if email is already taken
  const existing = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (existing) {
    throw new ValidationError("Email is already registered");
  }

  // Hash password
  const passwordHash = await hashPassword(input.password);

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      name: input.name,
      passwordHash,
      role: "user",
    })
    .returning();

  // Sign tokens
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = await signRefreshToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    accessToken,
    refreshToken,
  };
}

export async function login(input: LoginInput) {
  // Find user by email
  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (!user) {
    throw new NotFoundError("Invalid email or password");
  }

  // Verify password
  const isValid = await verifyPassword(user.passwordHash, input.password);
  if (!isValid) {
    throw new ValidationError("Invalid email or password");
  }

  // Sign tokens
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = await signRefreshToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    accessToken,
    refreshToken,
  };
}

export async function refresh(refreshToken: string) {
  // Verify the refresh token
  const payload = await verifyToken(refreshToken);

  // Find the user (ensure they still exist and are active)
  const user = await db.query.users.findFirst({
    where: eq(users.id, payload.sub as string),
  });

  if (!user || !user.isActive) {
    throw new ValidationError("Invalid refresh token");
  }

  // Sign new tokens
  const newAccessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const newRefreshToken = await signRefreshToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  };
}
```

---

## Step 5: Build the Auth Controller

```typescript
// src/modules/auth/auth.controller.ts
import {
  router,
  publicProcedure,
  protectedProcedure,
} from "@vibeonrails/core/api";
import { registerSchema, loginSchema, refreshSchema } from "./auth.types";
import * as authService from "./auth.service";

export const authRouter = router({
  /** Register a new user */
  register: publicProcedure
    .input(registerSchema)
    .mutation(({ input }) => authService.register(input)),

  /** Log in with email + password */
  login: publicProcedure
    .input(loginSchema)
    .mutation(({ input }) => authService.login(input)),

  /** Refresh an expired access token */
  refresh: publicProcedure
    .input(refreshSchema)
    .mutation(({ input }) => authService.refresh(input.refreshToken)),

  /** Get the authenticated user's profile */
  me: protectedProcedure.query(({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      role: ctx.user.role,
    };
  }),
});
```

---

## Step 6: Register the Auth Router

```typescript
// src/router.ts
import { createAppRouter } from "@vibeonrails/core/api";
import { authRouter } from "./modules/auth";

export const appRouter = createAppRouter({
  auth: authRouter,
  // ...other routers
});

export type AppRouter = typeof appRouter;
```

---

## Step 7: Test the Auth Flow

Start the dev server:

```bash
pnpm dev
```

### Register a User

```bash
curl -X POST http://localhost:3000/trpc/auth.register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "securepassword",
    "name": "Alice"
  }'
```

Response:

```json
{
  "result": {
    "data": {
      "user": {
        "id": "...",
        "email": "alice@example.com",
        "name": "Alice",
        "role": "user"
      },
      "accessToken": "eyJhbGciOi...",
      "refreshToken": "eyJhbGciOi..."
    }
  }
}
```

### Log In

```bash
curl -X POST http://localhost:3000/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d '{"email": "alice@example.com", "password": "securepassword"}'
```

### Access a Protected Route

```bash
curl http://localhost:3000/trpc/auth.me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Refresh Tokens

```bash
curl -X POST http://localhost:3000/trpc/auth.refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "YOUR_REFRESH_TOKEN"}'
```

---

## Step 8: Add Role-Based Access

Use `requireRole` to restrict endpoints to specific roles:

```typescript
import { requireRole } from "@vibeonrails/core/security";
import { protectedProcedure, router } from "@vibeonrails/core/api";

// Create an admin-only procedure
const adminProcedure = protectedProcedure.use(requireRole("admin"));

export const adminRouter = router({
  listAllUsers: adminProcedure.query(async () => {
    return db.query.users.findMany();
  }),

  deleteUser: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
```

If a non-admin user tries to access these routes, they receive a `403 Forbidden` response.

---

## Step 9: Add Google OAuth (Optional)

### Set Up the Provider

```typescript
// src/modules/auth/oauth.ts
import {
  defineGoogleProvider,
  buildAuthorizeUrl,
  exchangeCode,
  generateToken,
  signAccessToken,
  signRefreshToken,
} from "@vibeonrails/core/security";

const googleProvider = defineGoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: process.env.GOOGLE_REDIRECT_URI!,
});

export function getGoogleAuthUrl() {
  return buildAuthorizeUrl(googleProvider, {
    scopes: ["openid", "email", "profile"],
    state: generateToken(32),
  });
}

export async function handleGoogleCallback(code: string) {
  const { user: googleUser } = await exchangeCode(googleProvider, code);

  // Find or create local user
  let user = await db.query.users.findFirst({
    where: eq(users.email, googleUser.email),
  });

  if (!user) {
    const [newUser] = await db
      .insert(users)
      .values({
        email: googleUser.email,
        name: googleUser.name,
        passwordHash: "", // OAuth users don't have passwords
        role: "user",
      })
      .returning();
    user = newUser;
  }

  // Sign tokens
  const accessToken = await signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  const refreshToken = await signRefreshToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });

  return { user, accessToken, refreshToken };
}
```

### Add OAuth Routes

```typescript
// In your auth controller
export const authRouter = router({
  // ...existing routes

  googleUrl: publicProcedure.query(() => {
    return { url: getGoogleAuthUrl() };
  }),

  googleCallback: publicProcedure
    .input(z.object({ code: z.string() }))
    .mutation(({ input }) => handleGoogleCallback(input.code)),
});
```

---

## Step 10: Add Session-Based Auth (Alternative)

If you prefer server-side sessions instead of stateless JWTs:

```typescript
import {
  createSessionManager,
  createMemorySessionStore,
} from "@vibeonrails/core/security";

// Use memory store for development, Redis store for production
const sessionStore = createMemorySessionStore();
const sessions = createSessionManager(sessionStore);

export async function loginWithSession(email: string, password: string) {
  const user = await findAndVerifyUser(email, password);

  // Create a session
  const sessionId = await sessions.create({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return { sessionId };
}

export async function getSession(sessionId: string) {
  return sessions.get(sessionId);
}

export async function logout(sessionId: string) {
  await sessions.destroy(sessionId);
}
```

For production, implement a Redis-backed session store as described in the [Security Reference](../core/security).

---

## Frontend Integration

Use the `useAuth` hook from `@vibeonrails/web` to manage auth state on the client:

```typescript
import { useAuth, createApiClient } from '@vibeonrails/web';
import type { AppRouter } from '../router';

// Set up tRPC client
const { trpc } = createApiClient<AppRouter>('/trpc');

function LoginPage() {
  const { login: setAuth } = useAuth();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      // Redirect to dashboard
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      loginMutation.mutate({ email, password });
    }}>
      <Input type="email" value={email} onChange={setEmail} />
      <Input type="password" value={password} onChange={setPassword} />
      <Button type="submit" loading={loginMutation.isLoading}>
        Log In
      </Button>
    </form>
  );
}
```

---

## Security Checklist

Before going to production, verify:

- [ ] `JWT_SECRET` is a strong random string (32+ characters)
- [ ] Access tokens have short expiry (15 minutes)
- [ ] Refresh tokens are stored securely (httpOnly cookies)
- [ ] Password hashing uses Argon2 (default in Vibe on Rails)
- [ ] Failed login attempts are rate-limited
- [ ] OAuth state parameter is validated to prevent CSRF
- [ ] All sensitive routes use `protectedProcedure`
- [ ] Admin routes use `requireRole('admin')`

---

## Next Steps

- [Core Security Reference](../core/security) — Full API reference for JWT, passwords, OAuth, and crypto
- [Deploy to Production](./deploy) — Secure your deployment with proper environment variables
- [Infrastructure](../infra/overview) — Add session caching with Redis
