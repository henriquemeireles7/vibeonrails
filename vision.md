# Agent on Rails: The TypeScript Framework AI Agents Understand

## A Vision Document for the Next Generation of Web Development

---

# Part I: First Principles

## Chapter 1: Why Frameworks Exist

Frameworks exist to solve a fundamental problem: **repetition**.

Every web application needs authentication. Every web application needs a database. Every web application needs routing, validation, error handling, and a dozen other pieces of infrastructure. Without frameworks, developers would rebuild these same components from scratch for every project.

Ruby on Rails revolutionized web development in 2004 by recognizing a deeper truth: **most decisions don't matter**. The choice between tabs and spaces, between `user_id` and `userId`, between putting controllers in `/controllers` or `/handlers`—these decisions consume enormous cognitive energy while producing zero business value.

Rails made these decisions for you. It called this philosophy **"Convention over Configuration"**.

```
Before Rails:
- "Where should I put my database models?"
- "How should I name my database tables?"
- "What's the URL pattern for editing a resource?"

After Rails:
- Models go in app/models/
- A User model maps to a "users" table
- Edit URL is /users/:id/edit

No decisions required. Just build.
```

This philosophy worked because Rails understood something profound: **constraints liberate**. When you don't have to decide where files go, you can focus on what the files do.

## Chapter 2: The Rails Philosophy

Rails succeeded because of seven core principles:

### 1. Convention Over Configuration

If you follow the convention, everything just works:

```ruby
# Model: User → Table: users → File: app/models/user.rb
# Controller: UsersController → Route: /users
# View: app/views/users/index.html.erb

# Given JUST this:
class User < ApplicationRecord
  has_many :posts
end

# Rails knows:
# - Table is "users"
# - Primary key is "id"
# - Posts table has "user_id" foreign key
# - User.posts returns associated posts
```

### 2. Don't Repeat Yourself (DRY)

Single source of truth for every piece of knowledge:

```ruby
# Schema defined in ONE place (migration)
# → Types derived automatically
# → Validations can reference schema
# → Forms know field types
# → Tests can generate valid data
```

### 3. Omakase (Chef's Choice)

The framework authors pick the stack. You accept it:

- ORM: ActiveRecord (not "choose your ORM")
- Testing: Minitest (not "choose your test framework")
- Views: ERB (not "choose your templating")

**One way to do things means everyone can read everyone's code.**

### 4. Sharp Knives

Provide powerful tools. Trust developers to use them wisely:

```ruby
# Rails gives you metaprogramming
# You can do dangerous things
# But you can also do powerful things
User.find_by_email("test@example.com")  # Dynamic finder method
```

### 5. Value Integrated Systems

Majestic monolith over microservices. Everything works together out of the box.

### 6. Progress Over Stability

The framework evolves. Deprecations happen. Move forward.

### 7. Push Up the Menu

Make the right thing easy, the wrong thing possible but harder:

```bash
rails generate scaffold User name:string email:string
# Creates: model, migration, controller, views, routes, tests
# The "default path" is the "best practice path"
```

## Chapter 3: Why Rails is the Best Framework for AI

When AI agents started writing code, something unexpected happened: **they loved Rails**.

Claude, GPT-4, and other large language models consistently produce better Rails code than code for any other framework. Why?

**Predictability.**

Given a Rails project, an AI can answer these questions without reading any code:

| Question | Answer (Always) |
|----------|-----------------|
| Where are the models? | `app/models/` |
| Where are the controllers? | `app/controllers/` |
| What's the route for creating a post? | `POST /posts` |
| What's the file for the User model? | `app/models/user.rb` |
| What table does User map to? | `users` |

**The AI doesn't need to "figure out" your project structure. Rails tells it.**

This is the insight that launched Agent on Rails:

> **What if we designed a framework specifically for AI agents to understand?**

---

# Part II: The Agentic Paradigm

## Chapter 4: How AI Coding Differs from Human Coding

AI agents code differently than humans. Understanding these differences is essential to designing a framework for them.

### Context Window vs. Lifetime Memory

| Dimension | Human | AI Agent |
|-----------|-------|----------|
| Memory | Infinite (lifetime experience) | Limited (200K tokens, then forgets) |
| Revisiting | Can return to code anytime | Must re-read everything each session |

**Implication:** AI needs ALL relevant information in current context.

**Design Response:** File naming and folder structure must be self-documenting. An AI should understand what a file does from its path alone.

```
❌ Human-optimized (short, requires context):
src/lib/auth.ts
src/utils/helpers.ts

✓ AI-optimized (explicit, self-describing):
src/core/api/modules/authentication/authentication.service.ts
src/core/api/modules/authentication/authentication.guard.ts
```

### Pattern Learning

| Dimension | Human | AI Agent |
|-----------|-------|----------|
| Learning | Gradual, experiential | Instant if shown, but needs examples |
| Recall | "I've done this before" | Needs pattern in context window |

**Implication:** AI doesn't "remember" your codebase patterns between sessions.

**Design Response:** Patterns must be explicit documentation, not implicit tribal knowledge. Every folder gets a SKILL.md file explaining how to work with it.

### Ambiguity Tolerance

| Dimension | Human | AI Agent |
|-----------|-------|----------|
| Ambiguity | Handles well ("I'll figure it out") | Hallucinates or asks (wastes tokens) |

**Implication:** AI performs best with ZERO ambiguity.

**Design Response:** One way to do everything. No "it depends." No "you can also..."

### Error Recovery

| Dimension | Human | AI Agent |
|-----------|-------|----------|
| Debugging | Google, Stack Overflow, colleagues | Retry, often repeats same mistake |

**Implication:** AI needs fast feedback loops and clear error messages.

**Design Response:** Errors must say exactly what's wrong, where, and how to fix it:

```typescript
// ❌ Human-era error
Error: Cannot read property 'id' of undefined

// ✓ AI-era error
FrameworkError: [USER_NOT_FOUND]
  Location: src/core/api/modules/user/user.service.ts:45
  Method: UserService.findById(id: string)
  Input: { id: "abc-123" }
  Cause: No user exists with this ID
  Fix: Either:
    1. Check if user exists before calling: if (await userService.exists(id))
    2. Use findByIdOrFail() and handle UserNotFoundException
    3. Seed test data: npx aor db:seed
  Docs: https://aor.dev/errors/USER_NOT_FOUND
```

### Reading vs. Writing

| Dimension | Human | AI Agent |
|-----------|-------|----------|
| Ratio | Reads 10x more than writes | Can generate fast, but reading is expensive |
| Large codebases | Understands gradually | Must read relevant parts each time |

**Implication:** AI shouldn't need to read your whole codebase.

**Design Response:** Files should be independently understandable. Colocate related code.

### Creativity vs. Consistency

| Dimension | Human | AI Agent |
|-----------|-------|----------|
| Strength | Creative solutions | Consistent application of patterns |
| Weakness | Inconsistent style | May miss creative solutions |

**Implication:** AI is BETTER at consistency than humans.

**Design Response:** Define the pattern once, let AI apply it everywhere.

### Boilerplate

| Dimension | Human | AI Agent |
|-----------|-------|----------|
| Typing speed | ~60 WPM, thinks while typing | Instant generation |
| Boilerplate | Annoying, error-prone | Free, consistent |

**Implication:** Boilerplate is free for AI.

**Design Response:** Don't optimize for minimal code. Optimize for clarity. Explicit is better than implicit.

### Testing

| Dimension | Human | AI Agent |
|-----------|-------|----------|
| Testing | Often skips ("I'll test manually") | Can generate exhaustively, no fatigue |

**Implication:** AI can achieve 100% test coverage if we design for it.

**Design Response:** Testing patterns must be as predictable as code patterns.

## Chapter 5: The SKILL.md System

The most important innovation in Agent on Rails is the **SKILL.md** system.

Every folder in an AoR project contains a SKILL.md file that teaches AI agents how to work with that folder. This is not just documentation—it's a **training manual for AI**.

```
packages/
├── core/
│   ├── SKILL.md           ← "How to work with core business logic"
│   ├── api/
│   │   ├── SKILL.md       ← "How to create API endpoints"
│   │   └── modules/
│   │       ├── SKILL.md   ← "How to create feature modules"
│   │       └── user/
│   │           └── SKILL.md ← "How to work with user module"
```

### SKILL.md Structure

Every SKILL.md follows a consistent format:

```markdown
# [Folder Name] Skill

## Purpose
What this folder is for. When to add files here.

## Structure
The expected files and their purposes.

## Patterns
Step-by-step patterns with code examples.

## Examples
Complete examples of common tasks.

## Pitfalls
Things to avoid. Common mistakes.

## Related Skills
Links to other relevant SKILL.md files.
```

### Example: API Module Skill

```markdown
# API Modules Skill

## Purpose
This folder contains feature modules. Each module handles one
domain of your application (users, posts, payments, etc.).

## Structure
Each module follows this exact structure:

```
modules/
└── [name]/
    ├── [name].controller.ts    # HTTP handlers (tRPC routes)
    ├── [name].service.ts       # Business logic
    ├── [name].types.ts         # TypeScript types + Zod schemas
    ├── [name].test.ts          # Tests (colocated)
    └── SKILL.md                # Module-specific documentation
```

## Creating a New Module

When you need to add a feature (e.g., "comments"), follow this exact pattern:

### Step 1: Create the directory
```bash
mkdir -p src/core/api/modules/comment
```

### Step 2: Create types first
```typescript
// comment.types.ts
import { z } from 'zod';

export const CreateCommentSchema = z.object({
  body: z.string().min(1).max(1000),
  postId: z.string().uuid(),
});

export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
```

### Step 3: Create service
```typescript
// comment.service.ts
import { db } from '@aor/core/database';
import { CreateCommentInput } from './comment.types';

export const commentService = {
  async create(userId: string, input: CreateCommentInput) {
    return db.comments.create({ ...input, authorId: userId });
  },
  // ... other methods
};
```

### Step 4: Create controller
```typescript
// comment.controller.ts
import { router, protectedProcedure } from '@aor/core/api';
import { commentService } from './comment.service';
import { CreateCommentSchema } from './comment.types';

export const commentRouter = router({
  create: protectedProcedure
    .input(CreateCommentSchema)
    .mutation(({ ctx, input }) => 
      commentService.create(ctx.user.id, input)
    ),
});
```

### Step 5: Register the module
Add to `src/core/api/router.ts`:
```typescript
import { commentRouter } from './modules/comment/comment.controller';

export const appRouter = router({
  comment: commentRouter,
});
```

## Pitfalls

1. **Never import from frontend packages** - Backend must not depend on frontend
2. **Always validate input** - Use Zod schemas, never trust raw input
3. **Always check ownership** - Before update/delete, verify user has permission
4. **Use transactions for multi-step operations**
```

## Chapter 6: Parallel Coding Architecture

A revolutionary feature of Agent on Rails is its support for **parallel agentic coding**.

The insight: If every folder has a dedicated skill, and skills are independent, then **multiple AI agents can work on different folders simultaneously**.

### The Folder ↔ Skill ↔ Subagent Mapping

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                           │
│  "Add a comments feature to posts"                              │
│                                                                 │
│  Decomposes into:                                               │
│  1. Schema: Add Comment schema                                  │
│  2. Backend: Add Comment module                                 │
│  3. Frontend: Add Comments component                            │
│  4. Frontend: Update PostPage                                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┬─────────────────┐
        │                 │                 │                 │
        ▼                 ▼                 ▼                 ▼
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Schema    │   │   Backend   │   │  Component  │   │    Page     │
│   Agent     │   │   Module    │   │   Agent     │   │   Agent     │
│             │   │   Agent     │   │             │   │             │
│ Reads:      │   │ Reads:      │   │ Reads:      │   │ Reads:      │
│ schema/     │   │ modules/    │   │ components/ │   │ pages/      │
│ SKILL.md    │   │ SKILL.md    │   │ SKILL.md    │   │ SKILL.md    │
│             │   │             │   │             │   │             │
│ Creates:    │   │ Creates:    │   │ Creates:    │   │ Updates:    │
│ comment     │   │ comment/    │   │ Comments    │   │ PostPage    │
│ .schema.ts  │   │ module      │   │ List.tsx    │   │ .tsx        │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
      │                 │                 │                 │
      │                 │                 │                 │
      └─────────────────┴─────────────────┴─────────────────┘
                                │
                                ▼
                   ┌─────────────────────────┐
                   │      ORCHESTRATOR       │
                   │  Merges changes         │
                   │  Runs tests             │
                   │  Reports to user        │
                   └─────────────────────────┘
```

### Dependency Ordering

The orchestrator understands dependencies:

```
Schema (first, blocking)
    ↓
Backend + Frontend Components (parallel)
    ↓
Frontend Pages (needs components)
```

This architecture enables AI teams to work on features that would take a human team days to complete—in minutes.

---

# Part III: The Agent on Rails Architecture

## Chapter 7: Project Structure Overview

An Agent on Rails project has a clear, predictable structure:

```
my-app/
│
├── src/                            # ═══ SOURCE CODE ═══
│   ├── core/                       # Business logic (backend)
│   │   ├── api/                    # API layer
│   │   │   └── modules/            # Feature modules
│   │   ├── database/               # Database layer
│   │   ├── shared/                 # Shared types & utils
│   │   └── security/               # Auth & authorization
│   │
│   ├── infra/                      # Infrastructure (scaling)
│   │   ├── health/                 # Health checks
│   │   ├── cache/                  # Caching
│   │   ├── queue/                  # Background jobs
│   │   ├── realtime/               # WebSockets
│   │   ├── storage/                # File storage
│   │   ├── email/                  # Transactional email
│   │   ├── monitoring/             # Metrics & tracing
│   │   └── logging/                # Structured logging
│   │
│   ├── web/                        # Web frontend
│   │   ├── components/             # React components
│   │   ├── pages/                  # Page components
│   │   ├── styles/                 # CSS system
│   │   └── routes/                 # Routing
│   │
│   ├── mobile/                     # Mobile frontend (optional)
│   │   ├── components/             # React Native components
│   │   ├── screens/                # Screen components
│   │   └── navigation/             # Navigation
│   │
│   ├── features/                   # Optional features
│   │   ├── payments/               # Stripe
│   │   ├── support/                # Helpdesk
│   │   ├── admin/                  # Admin panel
│   │   ├── sales/                  # AI sales agent
│   │   └── marketing/              # Marketing automation
│   │
│   └── jobs/                       # Background jobs
│
├── content/                        # ═══ CONTENT (Non-Code) ═══
│   ├── locales/                    # Translated content
│   │   └── en/                     # English
│   │       ├── website/            # Landing pages, marketing
│   │       ├── emails/             # Email templates
│   │       ├── app/                # In-app copy
│   │       └── help/               # Knowledge base
│   ├── prompts/                    # AI prompts
│   └── brand/                      # Brand guidelines
│
├── .plan/                          # ═══ PLANNING ═══
│   ├── PROJECT.md                  # Project overview
│   ├── CONTEXT.md                  # AI context
│   ├── ROADMAP.md                  # Roadmap
│   └── tasks/                      # Task management
│
├── config/                         # ═══ CONFIGURATION ═══
│   ├── app.ts
│   ├── database.ts
│   └── env.ts
│
└── tests/                          # ═══ E2E TESTS ═══
    └── e2e/
```

## Chapter 8: Core Modules Deep Dive

### 8.1 The API Module (`src/core/api/`)

**Problem:** Every app needs HTTP endpoints. Setting up routing, middleware, validation, and error handling is tedious and error-prone.

**Solution:** A structured API layer built on Hono + tRPC with automatic type safety.

**Structure:**
```
src/core/api/
├── SKILL.md
├── modules/                    # Feature modules
│   ├── auth/
│   │   ├── auth.controller.ts  # tRPC router
│   │   ├── auth.service.ts     # Business logic
│   │   ├── auth.types.ts       # Types + validation
│   │   └── auth.test.ts        # Tests
│   ├── user/
│   └── post/
├── middleware/
│   ├── auth.ts                 # Authentication
│   ├── rate-limit.ts           # Rate limiting
│   └── error-handler.ts        # Error formatting
├── router.ts                   # Main router
└── server.ts                   # Server entry
```

**How It Works:**

```typescript
// 1. Define types and validation
// modules/post/post.types.ts
import { z } from 'zod';

export const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  published: z.boolean().default(false),
});

export type CreatePostInput = z.infer<typeof CreatePostSchema>;

// 2. Implement business logic
// modules/post/post.service.ts
export const postService = {
  async create(userId: string, input: CreatePostInput) {
    return db.posts.create({
      ...input,
      authorId: userId,
    });
  },

  async findById(id: string) {
    return db.posts.findUnique({ where: { id } });
  },

  async update(id: string, input: UpdatePostInput) {
    return db.posts.update({ where: { id }, data: input });
  },

  async delete(id: string) {
    return db.posts.delete({ where: { id } });
  },
};

// 3. Expose via controller
// modules/post/post.controller.ts
import { router, protectedProcedure, publicProcedure } from '../trpc';
import { postService } from './post.service';
import { CreatePostSchema } from './post.types';

export const postRouter = router({
  create: protectedProcedure
    .input(CreatePostSchema)
    .mutation(({ ctx, input }) => 
      postService.create(ctx.user.id, input)
    ),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => postService.findById(input.id)),

  // ... more endpoints
});

// 4. Register in main router
// router.ts
import { postRouter } from './modules/post/post.controller';

export const appRouter = router({
  post: postRouter,
});
```

**AI Benefits:**
- Clear file naming convention
- Predictable structure for every module
- Type safety prevents hallucinated APIs
- Tests colocated with code

### 8.2 The Database Module (`src/core/database/`)

**Problem:** Database setup is complex. Migrations, type generation, seeding—each requires different tools and configurations.

**Solution:** A unified database layer built on Drizzle with schema-first design.

**Structure:**
```
src/core/database/
├── SKILL.md
├── schema/                     # Table definitions
│   ├── user.ts
│   ├── post.ts
│   └── index.ts
├── migrations/                 # Generated migrations
│   ├── 0001_initial.sql
│   └── 0002_add_posts.sql
├── seeds/                      # Seed data
│   ├── development.ts
│   └── test.ts
├── repositories/               # Query helpers
│   ├── user.repository.ts
│   └── post.repository.ts
├── client.ts                   # Database client
└── index.ts                    # Exports
```

**Schema Definition:**

```typescript
// schema/user.ts
import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// schema/post.ts
import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './user';

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  published: boolean('published').default(false),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

**Repository Pattern:**

```typescript
// repositories/user.repository.ts
import { db } from '../client';
import { users } from '../schema';
import { eq } from 'drizzle-orm';

export const userRepository = {
  async findById(id: string) {
    return db.query.users.findFirst({
      where: eq(users.id, id),
    });
  },

  async findByEmail(email: string) {
    return db.query.users.findFirst({
      where: eq(users.email, email),
    });
  },

  async create(data: NewUser) {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  },

  async update(id: string, data: Partial<User>) {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  },
};
```

### 8.3 The Security Module (`src/core/security/`)

**Problem:** Security is complex and easy to get wrong. Authentication, authorization, encryption—each has subtle pitfalls.

**Solution:** A comprehensive security module with sensible defaults.

**Structure:**
```
src/core/security/
├── SKILL.md
├── auth/                       # Authentication
│   ├── jwt.ts                  # JWT handling
│   ├── sessions.ts             # Session management
│   ├── password.ts             # Argon2 hashing
│   └── oauth.ts                # OAuth providers
├── authorization/              # Authorization
│   ├── rbac.ts                 # Role-based access
│   ├── policies.ts             # Resource policies
│   └── guards.ts               # Route guards
├── crypto/                     # Cryptographic utils
│   ├── encrypt.ts              # Encryption
│   ├── hash.ts                 # Hashing
│   └── tokens.ts               # Secure tokens
├── middleware/                 # Security middleware
│   ├── helmet.ts               # HTTP headers
│   ├── cors.ts                 # CORS
│   └── csrf.ts                 # CSRF protection
└── audit/                      # Audit logging
    └── logger.ts
```

**Authentication Flow:**

```typescript
// auth/password.ts
import { hash, verify } from '@node-rs/argon2';

export async function hashPassword(password: string): Promise<string> {
  return hash(password, {
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return verify(hash, password);
}

// auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(env.JWT_SECRET);

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, secret);
  return payload as TokenPayload;
}
```

**Authorization:**

```typescript
// authorization/guards.ts
import { TRPCError } from '@trpc/server';

export function requireRole(...roles: Role[]) {
  return (ctx: Context) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }
    if (!roles.includes(ctx.user.role)) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
  };
}

export function requireOwnership(resourceUserId: string) {
  return (ctx: Context) => {
    if (ctx.user?.id !== resourceUserId && ctx.user?.role !== 'admin') {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
  };
}

// Usage in controller
deletePost: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const post = await postService.findById(input.id);
    if (!post) throw new TRPCError({ code: 'NOT_FOUND' });
    
    requireOwnership(post.authorId)(ctx);
    
    return postService.delete(input.id);
  }),
```

## Chapter 9: Infrastructure Modules Deep Dive

### 9.1 Health Module (`src/infra/health/`)

**Problem:** Load balancers and orchestrators need to know if your app is healthy.

**Solution:** Automatic health check endpoints with dependency checking.

```typescript
// health/checks.ts
export const healthChecks = {
  async database() {
    try {
      await db.execute(sql`SELECT 1`);
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  },

  async redis() {
    try {
      await redis.ping();
      return { status: 'ok' };
    } catch (error) {
      return { status: 'error', message: error.message };
    }
  },

  async memory() {
    const used = process.memoryUsage();
    const threshold = 0.9; // 90%
    const ratio = used.heapUsed / used.heapTotal;
    
    return ratio < threshold
      ? { status: 'ok', usage: `${(ratio * 100).toFixed(1)}%` }
      : { status: 'warning', usage: `${(ratio * 100).toFixed(1)}%` };
  },
};

// Endpoints (auto-registered)
// GET /health       → Full health check
// GET /health/live  → Process alive (k8s liveness)
// GET /health/ready → Dependencies ready (k8s readiness)
```

### 9.2 Queue Module (`src/infra/queue/`)

**Problem:** Long-running tasks block HTTP responses. You need background processing.

**Solution:** A simple job queue with cron support.

```typescript
// jobs/send-welcome-email.job.ts
import { defineJob } from '@aor/infra/queue';
import { email } from '@aor/infra/email';

export const sendWelcomeEmail = defineJob({
  name: 'send-welcome-email',
  schema: z.object({
    userId: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
  }),
  handler: async ({ userId, email: userEmail, name }) => {
    await email.send('welcome', {
      to: userEmail,
      data: { name, userId },
    });
  },
  retries: 3,
  backoff: 'exponential',
});

// Usage
await queue.enqueue(sendWelcomeEmail, {
  userId: user.id,
  email: user.email,
  name: user.name,
});

// Cron jobs
// cron/daily-report.cron.ts
export const dailyReport = defineCron({
  name: 'daily-report',
  schedule: '0 9 * * *', // 9am daily
  handler: async () => {
    const stats = await analytics.getDailyStats();
    await email.send('daily-report', {
      to: 'team@company.com',
      data: stats,
    });
  },
});
```

### 9.3 Email Module (`src/infra/email/`)

**Problem:** Sending emails requires templates, providers, and careful handling.

**Solution:** Markdown-based templates with automatic HTML conversion.

**Template Structure:**
```
content/locales/en/emails/
├── welcome.md
├── password-reset.md
├── invoice.md
└── notification.md
```

**Template Format:**
```markdown
<!-- content/locales/en/emails/welcome.md -->
---
subject: Welcome to {{appName}}, {{name}}!
preheader: Your account is ready. Let's get started.
---

# Welcome aboard, {{name}}! 🎉

We're thrilled to have you join **{{appName}}**.

Here's what you can do next:

1. [Complete your profile]({{profileUrl}})
2. [Explore the dashboard]({{dashboardUrl}})
3. [Read the getting started guide]({{docsUrl}})

If you have any questions, just reply to this email.

Cheers,
The {{appName}} Team
```

**Usage:**
```typescript
import { email } from '@aor/infra/email';

await email.send('welcome', {
  to: user.email,
  data: {
    appName: 'MyApp',
    name: user.name,
    profileUrl: `${baseUrl}/profile`,
    dashboardUrl: `${baseUrl}/dashboard`,
    docsUrl: `${baseUrl}/docs`,
  },
});
```

## Chapter 10: Frontend Architecture

### 10.1 The CSS System

**Problem:** AI agents struggle with CSS. They produce inconsistent styles, miss dark mode, and create unmaintainable stylesheets.

**Solution:** A token-based CSS system with semantic classes.

**Layer 1: Design Tokens**
```css
/* styles/tokens.css */
:root {
  /* Colors */
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  
  /* Semantic colors */
  --color-surface: #ffffff;
  --color-text: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  
  /* Spacing (8px base) */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  
  /* Typography */
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  
  /* Radius */
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
}

/* Dark mode - ONE place */
[data-theme="dark"] {
  --color-surface: #1f2937;
  --color-text: #f9fafb;
  --color-text-secondary: #9ca3af;
  --color-border: #374151;
}
```

**Layer 2: Layout Utilities**
```css
/* styles/layout.css */
.stack { display: flex; flex-direction: column; }
.stack-2 { gap: var(--space-2); }
.stack-4 { gap: var(--space-4); }

.row { display: flex; flex-direction: row; }
.row-2 { gap: var(--space-2); }
.row-between { justify-content: space-between; }
.row-center { align-items: center; }
```

**Layer 3: Component Classes**
```css
/* styles/components.css */
.btn {
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: all 150ms ease;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover {
  background: var(--color-primary-600);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}
```

**AI Usage:**
```tsx
// AI writes semantic, consistent classes
export function PostCard({ post }) {
  return (
    <article className="card">
      <div className="row row-between row-center">
        <h3>{post.title}</h3>
        <span className="badge badge-success">Published</span>
      </div>
      <p className="mt-4">{post.excerpt}</p>
      <div className="row row-2 mt-4">
        <button className="btn btn-ghost">Edit</button>
        <button className="btn btn-primary">View</button>
      </div>
    </article>
  );
}
```

### 10.2 Component Structure

```
src/web/components/
├── SKILL.md
├── ui/                         # Base UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Select.tsx
│   ├── Modal.tsx
│   └── Toast.tsx
├── forms/                      # Form components
│   ├── FormField.tsx
│   ├── UserForm.tsx            # Generated from schema
│   └── PostForm.tsx            # Generated from schema
├── data/                       # Data display
│   ├── DataTable.tsx
│   ├── Card.tsx
│   └── List.tsx
└── layout/                     # Layout components
    ├── Header.tsx
    ├── Sidebar.tsx
    └── PageLayout.tsx
```

### 10.3 Routing

**Rails-style routing translated to React:**

```typescript
// routes/index.ts
export const routes = defineRoutes({
  // Public
  home: '/',
  login: '/login',
  register: '/register',

  // Posts (resource routes)
  posts: '/posts',              // List
  postsNew: '/posts/new',       // Create form
  post: '/posts/:id',           // Show
  postEdit: '/posts/:id/edit',  // Edit form

  // Nested resources
  postComments: '/posts/:postId/comments',

  // Settings
  settings: '/settings',
  settingsProfile: '/settings/profile',
});

// Type-safe navigation
navigate(routes.post, { id: '123' }); // /posts/123
```

## Chapter 11: Feature Modules Deep Dive

### 11.1 Payments Module (`src/features/payments/`)

**Problem:** Integrating Stripe is complex—webhooks, subscriptions, customer portal, error handling.

**Solution:** A pre-built Stripe integration with common patterns.

```typescript
// One-time payment
const session = await payments.createCheckout({
  items: [{ priceId: 'price_123', quantity: 1 }],
  successUrl: '/success',
  cancelUrl: '/cancel',
});

// Subscription
const subscription = await payments.createSubscription({
  customerId: user.stripeCustomerId,
  priceId: 'price_monthly_pro',
});

// Webhook handling (auto-registered)
payments.on('checkout.session.completed', async (event) => {
  const session = event.data.object;
  await orders.fulfill(session.metadata.orderId);
});

payments.on('customer.subscription.deleted', async (event) => {
  const subscription = event.data.object;
  await users.downgradeToFree(subscription.metadata.userId);
});
```

### 11.2 Support Module (`src/features/support/`)

**Problem:** Every app needs customer support. Building a helpdesk from scratch is weeks of work.

**Solution:** A complete helpdesk with AI-powered first response.

**Features:**
- Knowledge base (Markdown articles)
- Ticket system
- Live chat widget
- AI support agent (answers common questions)

```typescript
// Embed chat widget
import { ChatWidget } from '@aor/features/support';

<ChatWidget 
  position="bottom-right"
  aiEnabled={true}
  greeting="Hi! How can I help you today?"
/>

// AI handles common questions automatically
// Escalates to human when needed
```

### 11.3 Admin Module (`src/features/admin/`)

**Problem:** Every app needs an admin panel for managing users, content, and settings.

**Solution:** Auto-generated admin UI from your schema.

```typescript
// Schema includes admin config
export const PostSchema = defineSchema('Post', {
  fields: {
    title: field.string(),
    body: field.text(),
    published: field.boolean(),
  },
  admin: {
    listFields: ['title', 'published', 'createdAt'],
    searchFields: ['title', 'body'],
    filters: ['published'],
  },
});

// Auto-generates:
// /admin/posts         (list with search/filter)
// /admin/posts/new     (create form)
// /admin/posts/:id     (detail view)
// /admin/posts/:id/edit (edit form)
```

### 11.4 Sales Module (`src/features/sales/`)

**Problem:** You want to automate sales conversations without losing the personal touch.

**Solution:** An AI sales agent that qualifies leads and books demos.

**Architecture:**
```
WhatsApp/Telegram/Website
         │
         ▼
   OpenClaw Gateway
         │
         ▼
   Sales AI Agent
   ├── Answer FAQs
   ├── Qualify leads (BANT)
   ├── Book demos
   └── Handoff to human
```

**Configuration:**
```typescript
// config/sales.ts
export const salesConfig = {
  agent: {
    name: 'Alex',
    tone: 'friendly-professional',
  },
  channels: {
    whatsapp: { enabled: true, number: '+1234567890' },
    telegram: { enabled: true, bot: '@myapp_sales' },
    webchat: { enabled: true },
  },
  qualification: {
    questions: ['company_size', 'budget', 'timeline', 'decision_maker'],
  },
  handoff: {
    triggers: ['request_human', 'complex_question', 'complaint'],
    notifyVia: ['slack', 'email'],
  },
};
```

### 11.5 Marketing Module (`src/features/marketing/`)

**Problem:** Marketing automation is fragmented—social posting here, email there, analytics elsewhere.

**Solution:** Unified marketing automation with AI content generation.

**Features:**
- AI content generation (social posts, emails)
- Multi-platform social scheduling
- Email drip sequences
- Landing page builder
- Marketing analytics

```typescript
// Generate social post
const post = await marketing.content.generate({
  type: 'social-post',
  platform: 'twitter',
  topic: 'New feature: Dark mode',
  tone: 'excited',
});
// Result: "🌙 Dark mode is here! Your eyes will thank you..."

// Schedule across platforms
await marketing.social.schedule({
  content: post,
  platforms: ['twitter', 'linkedin'],
  scheduledAt: new Date('2024-01-20T10:00:00'),
});

// Email drip sequence
export const welcomeSequence = defineSequence({
  name: 'welcome',
  trigger: 'user.signup',
  steps: [
    { template: 'welcome-1', delay: '0' },
    { template: 'welcome-2', delay: '2d' },
    { template: 'welcome-3', delay: '7d', condition: (u) => !u.completedOnboarding },
  ],
});
```

---

# Part IV: The Content System

## Chapter 12: Content Separate from Code

**Principle:** Content is not code. It should be editable by non-developers and easy for AI to modify.

**Structure:**
```
content/
├── SKILL.md                    # Writing skill for AI
├── locales/
│   ├── en/                     # English (default)
│   │   ├── website/            # Website copy
│   │   │   ├── landing.md
│   │   │   ├── pricing.md
│   │   │   └── about.md
│   │   ├── emails/             # Email templates
│   │   │   ├── welcome.md
│   │   │   └── password-reset.md
│   │   ├── app/                # In-app copy
│   │   │   ├── onboarding.md
│   │   │   └── errors.md
│   │   └── help/               # Knowledge base
│   │       └── getting-started/
│   └── pt-BR/                  # Portuguese
│       └── ...
├── prompts/                    # AI prompts
│   ├── agent/
│   └── templates/
└── brand/                      # Brand guidelines
    ├── voice.md
    └── terminology.md
```

**Content Format:**
```markdown
<!-- content/locales/en/website/landing.md -->
---
title: Build apps at the speed of thought
description: The TypeScript framework AI agents understand
---

# {{hero.headline}}
Build production apps in hours, not weeks.

## Features

### Schema-First Development
Define your data once. Generate everything else.

### AI-Native Architecture
Every folder has a SKILL.md. Your AI agent knows exactly where to look.

### Batteries Included
Auth, payments, email, storage—all included. No more gluing together 47 packages.
```

---

# Part V: The Planning System

## Chapter 13: Agentic Planning

**Problem:** AI agents need context about what to build. Human project management tools aren't designed for AI consumption.

**Solution:** A Markdown-based planning system that AI agents can read and update.

**Structure:**
```
.plan/
├── SKILL.md                    # How to use planning
├── PROJECT.md                  # What is this project?
├── ROADMAP.md                  # Where are we going?
├── CURRENT.md                  # What are we doing NOW?
├── CONTEXT.md                  # Context for AI agents
├── DECISIONS.md                # Why we made key decisions
└── tasks/
    ├── backlog/                # Future tasks
    ├── active/                 # In-progress
    └── done/                   # Completed
```

**CONTEXT.md Example:**
```markdown
# Context for AI Agents

## Codebase Overview
This is an Agent on Rails project.
- src/core/ = Business logic
- src/infra/ = Infrastructure
- src/web/ = Web frontend
- content/ = Written content

## Key Patterns
1. Always read SKILL.md before modifying a folder
2. Tests go next to the file they test (*.test.ts)
3. Schema is source of truth—generate, don't handwrite
4. Content is in content/, not hardcoded in components

## Current State
- Auth: Complete ✓
- User profiles: In progress
- Posts: Not started

## Things to Avoid
- Don't add new dependencies without discussing
- Don't modify generated files (marked "DO NOT EDIT")
- Don't skip writing tests
```

**Task Format:**
```markdown
<!-- .plan/tasks/active/feat-comments.md -->
---
id: feat-comments
title: Add Comments to Posts
status: active
priority: high
---

# Add Comments to Posts

## Goal
Users can comment on posts.

## Requirements
- [ ] Comment schema
- [ ] Comment API endpoints
- [ ] CommentList component
- [ ] CommentForm component
- [ ] Update PostPage to show comments

## Technical Notes
- Comments belong to Post and User
- Nested comments not needed for MVP
- Rate limit to 10 comments/minute per user

## Progress
- [x] Schema created
- [ ] API endpoints
- [ ] Frontend components
```

---

# Part VI: Deployment

## Chapter 14: One-Command Deploy

**Philosophy:** Deployment should be as simple as `npx aor deploy`.

**Build Output:**
```
dist/
├── server/
│   ├── index.js        # API server
│   └── worker.js       # Background worker
├── web/
│   ├── index.html      # SPA entry
│   └── assets/         # JS, CSS
└── package.json
```

**Deployment Targets:**

```bash
# Railway (recommended for simplicity)
npx aor deploy railway

# Fly.io (recommended for global)
npx aor deploy fly

# Docker (self-hosted)
npx aor build:docker
docker push registry.example.com/my-app
```

**Production Architecture:**
```
         ┌─────────────────┐
         │   Cloudflare    │
         │   (CDN + WAF)   │
         └────────┬────────┘
                  │
    ┌─────────────┼─────────────┐
    │             │             │
    ▼             ▼             ▼
┌───────┐   ┌───────┐   ┌───────┐
│ API 1 │   │ API 2 │   │ API 3 │
└───┬───┘   └───┬───┘   └───┬───┘
    │           │           │
    └───────────┼───────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
    ▼           ▼           ▼
┌───────┐   ┌───────┐   ┌───────┐
│Postgres│  │ Redis │   │Storage│
└───────┘   └───┬───┘   └───────┘
                │
                ▼
           ┌───────┐
           │Worker │
           └───────┘
```

---

# Part VII: Conclusion

## The Vision

Agent on Rails is not just another TypeScript framework. It's a fundamental rethinking of how software should be built in the age of AI.

**For AI Agents:**
- Every folder has a SKILL.md teaching how to work with it
- Predictable structure means zero ambiguity
- Parallel coding architecture enables teams of agents

**For Humans:**
- Batteries included—everything you need for production
- Schema-first development—define once, generate everything
- Beautiful by default—CSS system that AI can use correctly

**For Businesses:**
- Zero to deployed in under 30 minutes
- Full-stack solution from a single framework
- Built-in support, admin, marketing, sales modules

## The Promise

With Agent on Rails, a solo founder with an AI agent can build what used to require a team of ten. The framework handles the infrastructure; you focus on your product.

```bash
npx create-aor my-startup
cd my-startup
npx aor dev

# Your AI agent can now:
# - Add features by reading SKILL.md files
# - Work in parallel on different modules
# - Generate code that follows conventions
# - Write tests that actually test things
# - Deploy with one command

npx aor deploy
```

**This is the future of software development.**

**This is Agent on Rails.**

---

*"The best framework is one your AI agent can understand without asking questions."*