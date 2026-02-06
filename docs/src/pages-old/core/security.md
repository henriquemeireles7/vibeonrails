# Core: Security

The `@vibeonrails/core/security` module provides a complete security toolkit: JWT authentication, password hashing with Argon2, session management, OAuth providers, CSRF protection, authorization guards, cryptographic utilities, and audit logging.

---

## Installation

```bash
pnpm add @vibeonrails/core
```

```typescript
import {
  // Authentication
  signAccessToken, signRefreshToken, verifyToken,
  hashPassword, verifyPassword,
  createSessionManager, createMemorySessionStore,
  defineGoogleProvider, defineGitHubProvider, defineDiscordProvider,
  buildAuthorizeUrl, exchangeCode,

  // Authorization
  requireRole, requireOwnership,

  // Crypto
  encrypt, decrypt, generateEncryptionKey,
  sha256, hmacSha256,
  generateToken, generateOTP,

  // Middleware
  generateCsrfToken, verifyCsrfToken,

  // Audit
  audit, registerAuditSink,
} from '@vibeonrails/core/security';
```

---

## JWT Authentication

Vibe on Rails uses **jose** for JWT operations — a modern, edge-runtime compatible library.

### `signAccessToken(payload)`

Signs a short-lived access token (default: 15 minutes).

```typescript
import { signAccessToken } from '@vibeonrails/core/security';

const token = await signAccessToken({
  sub: user.id,
  email: user.email,
  role: user.role,
});

// Returns: "eyJhbGciOiJIUzI1NiIs..."
```

### `signRefreshToken(payload)`

Signs a long-lived refresh token (default: 7 days).

```typescript
import { signRefreshToken } from '@vibeonrails/core/security';

const refreshToken = await signRefreshToken({
  sub: user.id,
  email: user.email,
  role: user.role,
});
```

### `verifyToken(token)`

Verifies and decodes a JWT. Throws if the token is invalid or expired.

```typescript
import { verifyToken } from '@vibeonrails/core/security';

try {
  const payload = await verifyToken(token);
  console.log(payload.sub);   // user ID
  console.log(payload.email); // user email
  console.log(payload.role);  // user role
} catch (error) {
  // Token is invalid or expired
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for signing tokens (min 32 chars) | *required* |
| `JWT_ISSUER` | Token issuer claim | `'vibeonrails'` |

### Token Flow

```
1. User logs in with email + password
2. Server verifies credentials
3. Server signs access token + refresh token
4. Client stores tokens (httpOnly cookies recommended)
5. Client sends access token in Authorization header
6. Server verifies token via createContext (automatic)
7. When access token expires, use refresh token to get a new pair
```

---

## Password Hashing

Vibe on Rails uses **Argon2** (via `@node-rs/argon2`) — the winner of the Password Hashing Competition and the recommended algorithm for password storage.

### `hashPassword(password)`

Hashes a plain-text password using Argon2id.

```typescript
import { hashPassword } from '@vibeonrails/core/security';

const hash = await hashPassword('my-secure-password');
// Returns: "$argon2id$v=19$m=19456,t=2,p=1$..."
```

### `verifyPassword(hash, password)`

Verifies a plain-text password against an Argon2 hash.

```typescript
import { verifyPassword } from '@vibeonrails/core/security';

const isValid = await verifyPassword(user.passwordHash, 'my-secure-password');
if (!isValid) {
  throw new Error('Invalid credentials');
}
```

### Complete Login Example

```typescript
import { hashPassword, verifyPassword, signAccessToken, signRefreshToken } from '@vibeonrails/core/security';

// Registration
async function register(email: string, password: string, name: string) {
  const passwordHash = await hashPassword(password);
  const user = await userRepo.create({ email, name, passwordHash });
  return { user: { id: user.id, email: user.email } };
}

// Login
async function login(email: string, password: string) {
  const user = await userRepo.findByEmail(email);
  if (!user) throw new NotFoundError('User not found');

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) throw new ValidationError('Invalid credentials');

  const accessToken = await signAccessToken({
    sub: user.id, email: user.email, role: user.role,
  });
  const refreshToken = await signRefreshToken({
    sub: user.id, email: user.email, role: user.role,
  });

  return { accessToken, refreshToken };
}
```

---

## Sessions

For applications that prefer server-side sessions over stateless JWTs.

### `createSessionManager(store)`

Creates a session manager backed by a pluggable session store.

```typescript
import { createSessionManager, createMemorySessionStore } from '@vibeonrails/core/security';

// In-memory store (development only)
const store = createMemorySessionStore();
const sessions = createSessionManager(store);

// Create a session
const sessionId = await sessions.create({
  userId: user.id,
  email: user.email,
  role: user.role,
});

// Get session data
const data = await sessions.get(sessionId);

// Destroy a session (logout)
await sessions.destroy(sessionId);
```

### Custom Session Store

Implement the `SessionStore` interface for production use (e.g., Redis):

```typescript
import type { SessionStore, SessionData } from '@vibeonrails/core/security';
import { createCache } from '@vibeonrails/infra/cache';

const cache = createCache({ url: process.env.REDIS_URL! });

const redisSessionStore: SessionStore = {
  async get(id: string): Promise<SessionData | null> {
    return cache.get(`session:${id}`);
  },
  async set(id: string, data: SessionData, ttlMs: number): Promise<void> {
    await cache.set(`session:${id}`, data, ttlMs);
  },
  async delete(id: string): Promise<void> {
    await cache.del(`session:${id}`);
  },
};

const sessions = createSessionManager(redisSessionStore);
```

---

## OAuth

Built-in support for Google, GitHub, and Discord OAuth providers.

### Define Providers

```typescript
import {
  defineGoogleProvider,
  defineGitHubProvider,
  defineDiscordProvider,
} from '@vibeonrails/core/security';

const googleAuth = defineGoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  redirectUri: 'http://localhost:3000/auth/google/callback',
});

const githubAuth = defineGitHubProvider({
  clientId: process.env.GITHUB_CLIENT_ID!,
  clientSecret: process.env.GITHUB_CLIENT_SECRET!,
  redirectUri: 'http://localhost:3000/auth/github/callback',
});

const discordAuth = defineDiscordProvider({
  clientId: process.env.DISCORD_CLIENT_ID!,
  clientSecret: process.env.DISCORD_CLIENT_SECRET!,
  redirectUri: 'http://localhost:3000/auth/discord/callback',
});
```

### OAuth Flow

```typescript
import { buildAuthorizeUrl, exchangeCode } from '@vibeonrails/core/security';

// Step 1: Redirect user to the provider
const authorizeUrl = buildAuthorizeUrl(googleAuth, {
  scopes: ['openid', 'email', 'profile'],
  state: generateToken(32), // CSRF protection
});
// Redirect user to authorizeUrl

// Step 2: Handle the callback
const { user: oauthUser } = await exchangeCode(googleAuth, code);
// oauthUser: { id, email, name, avatar }

// Step 3: Find or create local user, sign tokens
const localUser = await findOrCreateOAuthUser(oauthUser);
const accessToken = await signAccessToken({ sub: localUser.id, ... });
```

---

## Authorization Guards

### `requireRole(role)`

tRPC middleware that restricts access to users with a specific role.

```typescript
import { requireRole } from '@vibeonrails/core/security';
import { protectedProcedure, router } from '@vibeonrails/core/api';

const adminProcedure = protectedProcedure.use(requireRole('admin'));

export const adminRouter = router({
  listAllUsers: adminProcedure.query(() => getAllUsers()),
  deleteUser: adminProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(({ input }) => deleteUser(input.id)),
});
```

### `requireOwnership(getResourceOwnerId)`

tRPC middleware that ensures the authenticated user owns the resource they're accessing.

```typescript
import { requireOwnership } from '@vibeonrails/core/security';

const ownerProcedure = protectedProcedure.use(
  requireOwnership(async ({ input, ctx }) => {
    const post = await getPost(input.id);
    return post?.authorId; // Return the owner's ID
  }),
);

export const postRouter = router({
  update: ownerProcedure
    .input(z.object({ id: z.string().uuid(), title: z.string() }))
    .mutation(({ input }) => updatePost(input.id, { title: input.title })),
});
```

---

## Cryptographic Utilities

### Encryption

AES-256-GCM symmetric encryption for sensitive data at rest.

```typescript
import { encrypt, decrypt, generateEncryptionKey } from '@vibeonrails/core/security';

// Generate a key (store in environment variables)
const key = generateEncryptionKey();

// Encrypt
const encrypted = encrypt('sensitive data', key);

// Decrypt
const decrypted = decrypt(encrypted, key);
// "sensitive data"
```

### Hashing

```typescript
import { sha256, hmacSha256 } from '@vibeonrails/core/security';

// SHA-256 hash
const hash = sha256('data to hash');

// HMAC-SHA256 (for webhook signature verification, etc.)
const signature = hmacSha256('payload', 'webhook-secret');
```

### Token Generation

```typescript
import { generateToken, generateOTP } from '@vibeonrails/core/security';

// Generate a cryptographically random hex token
const resetToken = generateToken(32); // 64-char hex string

// Generate a numeric OTP
const otp = generateOTP(6); // "482913"
```

---

## CSRF Protection

### `generateCsrfToken(secret)`

Generates a CSRF token tied to a secret.

```typescript
import { generateCsrfToken, verifyCsrfToken } from '@vibeonrails/core/security';

// Generate a token (send to the client)
const csrfToken = generateCsrfToken(process.env.CSRF_SECRET!);

// Verify the token on form submission
const isValid = verifyCsrfToken(csrfToken, process.env.CSRF_SECRET!);
```

### Usage Pattern

```typescript
// In your form endpoint:
app.post('/submit', async (c) => {
  const token = c.req.header('x-csrf-token');
  if (!token || !verifyCsrfToken(token, process.env.CSRF_SECRET!)) {
    return c.json({ error: 'Invalid CSRF token' }, 403);
  }
  // Process the form...
});
```

---

## Audit Logging

Track security-relevant events for compliance and debugging.

### `audit(event)`

Records an audit event.

```typescript
import { audit } from '@vibeonrails/core/security';

await audit({
  type: 'user.login',
  userId: user.id,
  metadata: { ip: request.ip, userAgent: request.headers['user-agent'] },
});

await audit({
  type: 'user.password_changed',
  userId: user.id,
  metadata: { changedBy: admin.id },
});
```

### `registerAuditSink(sink)`

Register a destination for audit events. You can have multiple sinks (database, file, external service).

```typescript
import { registerAuditSink } from '@vibeonrails/core/security';

// Log to console
registerAuditSink(async (event) => {
  console.log(`[AUDIT] ${event.type}`, event);
});

// Store in database
registerAuditSink(async (event) => {
  await db.insert(auditLogs).values({
    type: event.type,
    userId: event.userId,
    metadata: event.metadata,
    timestamp: new Date(),
  });
});
```

### Audit Event Types

| Type | Description |
|------|-------------|
| `user.login` | Successful login |
| `user.logout` | User logged out |
| `user.login_failed` | Failed login attempt |
| `user.registered` | New user registration |
| `user.password_changed` | Password was changed |
| `user.role_changed` | Role was modified |
| `resource.created` | Resource was created |
| `resource.updated` | Resource was modified |
| `resource.deleted` | Resource was deleted |

---

## Security Best Practices

1. **Always hash passwords** — Never store plain-text passwords. Use `hashPassword`.
2. **Use short-lived access tokens** — 15 minutes is recommended. Use refresh tokens for renewal.
3. **Store secrets in environment variables** — Never hardcode `JWT_SECRET` or encryption keys.
4. **Enable CSRF protection** — For any form-based submissions.
5. **Audit sensitive operations** — Login, password changes, role changes, and deletions.
6. **Use `protectedProcedure`** — For any endpoint that requires authentication.
7. **Use `requireRole`/`requireOwnership`** — For fine-grained access control.
8. **Validate all inputs** — Use Zod schemas on every tRPC procedure.
