# Vibe on Rails: Implementation Guide

## A Technical Roadmap for Building the Framework

---

# Part I: Implementation Overview

## Chapter 1: What We're Building

Vibe on Rails is a TypeScript framework consisting of:

1. **Framework Packages** (npm packages we publish)
2. **CLI Tool** (scaffolding and code generation)
3. **Templates** (project and module templates)
4. **Documentation** (SKILL.md files and docs site)

### Package Structure

```
agent-on-rails/                    # Framework monorepo
├── packages/
│   ├── core/                      # @vibeonrails/core
│   ├── infra/                     # @vibeonrails/infra
│   ├── web/                       # @vibeonrails/web
│   ├── mobile/                    # @vibeonrails/mobile
│   ├── cli/                       # @vibeonrails/cli (create-vibe)
│   └── features/
│       ├── payments/              # @vibeonrails/payments
│       ├── support/               # @vibeonrails/support
│       ├── admin/                 # @vibeonrails/admin
│       ├── sales/                 # @vibeonrails/sales
│       └── marketing/             # @vibeonrails/marketing
├── templates/
│   ├── app/                       # Full app template
│   ├── module/                    # API module template
│   └── component/                 # Component template
├── docs/                          # Documentation site
└── examples/                      # Example applications
```

## Chapter 2: Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Runtime | Node.js 22+ | Maximum compatibility |
| Package Manager | pnpm | Best monorepo support |
| Monorepo Tool | Turborepo | Fast builds, caching |
| HTTP Server | Hono | Fast, edge-ready |
| API Layer | tRPC | End-to-end type safety |
| Database | Drizzle ORM | Type-safe SQL |
| Validation | Zod | Industry standard |
| Build Tool | Vite | Fast, simple |
| UI Library | React 19 | Most AI training data |
| State | Zustand | Simple, predictable |
| Email | Resend | Modern API |
| Queue | BullMQ | Mature, Redis-based |

---

# Part II: Core Package Implementation

## Chapter 3: @vibeonrails/core Package

### 3.1 Structure

```
packages/core/
├── package.json
├── src/
│   ├── api/
│   │   ├── server.ts
│   │   ├── router.ts
│   │   ├── trpc.ts
│   │   ├── context.ts
│   │   └── middleware/
│   ├── database/
│   │   ├── client.ts
│   │   └── migrate.ts
│   ├── security/
│   │   ├── auth/
│   │   │   ├── jwt.ts
│   │   │   └── password.ts
│   │   └── authorization/
│   │       └── guards.ts
│   ├── shared/
│   │   ├── types/
│   │   ├── utils/
│   │   └── errors/
│   └── index.ts
└── SKILL.md
```

### 3.2 API Server Implementation

```typescript
// packages/core/src/api/server.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { trpcServer } from '@hono/trpc-server';
import { appRouter } from './router';
import { createContext } from './context';

export function createServer() {
  const app = new Hono();

  // Middleware
  app.use('*', logger());
  app.use('*', secureHeaders());
  app.use('*', cors({ origin: (origin) => origin, credentials: true }));

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok' }));

  // tRPC
  app.use('/trpc/*', trpcServer({
    router: appRouter,
    createContext,
  }));

  return app;
}

export type AppRouter = typeof appRouter;
```

### 3.3 tRPC Setup

```typescript
// packages/core/src/api/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
```

### 3.4 Database Client

```typescript
// packages/core/src/database/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
```

### 3.5 Authentication

```typescript
// packages/core/src/security/auth/jwt.ts
import { SignJWT, jwtVerify } from 'jose';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

export async function signAccessToken(user: { id: string; email: string; role: string }) {
  return new SignJWT({ sub: user.id, email: user.email, role: user.role })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(secret);
}

export async function verifyToken(token: string) {
  const { payload } = await jwtVerify(token, secret);
  return payload;
}

// packages/core/src/security/auth/password.ts
import { hash, verify } from '@node-rs/argon2';

export async function hashPassword(password: string) {
  return hash(password, { memoryCost: 65536, timeCost: 3, parallelism: 4 });
}

export async function verifyPassword(password: string, hashed: string) {
  return verify(hashed, password);
}
```

### 3.6 Error Handling

```typescript
// packages/core/src/shared/errors/index.ts
export const ErrorCodes = {
  AUTH_INVALID_CREDENTIALS: 'E1001',
  USER_NOT_FOUND: 'E2001',
  RESOURCE_NOT_FOUND: 'E3001',
  VALIDATION_FAILED: 'E4001',
} as const;

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      docs: `https://vibeonrails.dev/errors/${this.code}`,
    };
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(ErrorCodes.RESOURCE_NOT_FOUND, `${resource} not found`, 404, { resource, id });
  }
}
```

---

## Chapter 4: @vibeonrails/infra Package

### 4.1 Structure

```
packages/infra/
├── src/
│   ├── health/
│   │   └── checks.ts
│   ├── cache/
│   │   └── client.ts
│   ├── queue/
│   │   ├── job.ts
│   │   └── worker.ts
│   ├── email/
│   │   ├── client.ts
│   │   └── templates.ts
│   ├── storage/
│   │   └── client.ts
│   └── logging/
│       └── logger.ts
└── SKILL.md
```

### 4.2 Health Checks

```typescript
// packages/infra/src/health/checks.ts
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
    } catch {
      return { status: 'degraded' };
    }
  },
};
```

### 4.3 Job Queue

```typescript
// packages/infra/src/queue/job.ts
import { z } from 'zod';

export function defineJob<T extends z.ZodType>(config: {
  name: string;
  schema: T;
  handler: (data: z.infer<T>) => Promise<void>;
  options?: { retries?: number; backoff?: 'fixed' | 'exponential' };
}) {
  return config;
}

// Usage
export const sendEmailJob = defineJob({
  name: 'send-email',
  schema: z.object({ to: z.string().email(), template: z.string() }),
  handler: async ({ to, template }) => {
    await email.send(template, { to });
  },
  options: { retries: 3, backoff: 'exponential' },
});
```

### 4.4 Email

```typescript
// packages/infra/src/email/client.ts
import { Resend } from 'resend';
import { loadTemplate, renderMarkdown } from './templates';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function send(templateName: string, options: { to: string; data?: Record<string, unknown> }) {
  const template = await loadTemplate(templateName);
  const { subject, html, text } = await renderMarkdown(template, options.data);
  
  return resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: options.to,
    subject,
    html,
    text,
  });
}
```

### 4.5 Logging

```typescript
// packages/infra/src/logging/logger.ts
class Logger {
  private context: Record<string, unknown> = {};

  child(ctx: Record<string, unknown>) {
    const child = new Logger();
    child.context = { ...this.context, ...ctx };
    return child;
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log('info', message, data);
  }

  error(message: string, error?: Error) {
    this.log('error', message, error ? { error: { message: error.message, stack: error.stack } } : undefined);
  }

  private log(level: string, message: string, data?: Record<string, unknown>) {
    const entry = { level, message, timestamp: new Date().toISOString(), ...this.context, ...data };
    console.log(process.env.NODE_ENV === 'development' 
      ? `[${level.toUpperCase()}] ${message}` 
      : JSON.stringify(entry));
  }
}

export const logger = new Logger();
```

---

## Chapter 5: @vibeonrails/web Package

### 5.1 Structure

```
packages/web/
├── src/
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   └── motion.css
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Modal.tsx
│   │   ├── forms/
│   │   │   └── FormField.tsx
│   │   └── layout/
│   │       └── PageLayout.tsx
│   ├── hooks/
│   │   ├── useApi.ts
│   │   └── useAuth.ts
│   └── index.ts
└── SKILL.md
```

### 5.2 CSS System (Tokens)

```css
/* packages/web/src/styles/tokens.css */
:root {
  /* Colors */
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-surface: #ffffff;
  --color-text: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #e5e7eb;
  --color-error: #ef4444;
  --color-success: #22c55e;
  
  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  
  /* Typography */
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  
  /* Radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
}

/* Dark mode */
[data-theme="dark"] {
  --color-surface: #1f2937;
  --color-text: #f9fafb;
  --color-text-secondary: #9ca3af;
  --color-border: #374151;
}
```

### 5.3 Component Classes

```css
/* packages/web/src/styles/components.css */
.btn {
  display: inline-flex;
  align-items: center;
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 500;
  border-radius: var(--radius-md);
  transition: all 150ms;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover { background: var(--color-primary-600); }

.input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}
```

### 5.4 UI Components

```tsx
// packages/web/src/components/ui/Button.tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, children, ...props }, ref) => (
    <button
      ref={ref}
      className={`btn btn-${variant} ${size !== 'md' ? `btn-${size}` : ''} ${className || ''}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className="animate-spin mr-2">⟳</span>}
      {children}
    </button>
  )
);
```

### 5.5 Hooks

```tsx
// packages/web/src/hooks/useAuth.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: { id: string; email: string; name: string } | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  login: (user: AuthState['user'], token: string) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      login: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      logout: () => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    { name: 'auth-storage' }
  )
);
```

---

## Chapter 6: @vibeonrails/cli Package

### 6.1 Structure

```
packages/cli/
├── bin/
│   └── aor.js
├── src/
│   ├── commands/
│   │   ├── create.ts
│   │   ├── generate.ts
│   │   ├── dev.ts
│   │   └── deploy.ts
│   ├── generators/
│   │   ├── app.generator.ts
│   │   └── module.generator.ts
│   └── index.ts
└── SKILL.md
```

### 6.2 Create Command

```typescript
// packages/cli/src/commands/create.ts
import { Command } from 'commander';
import inquirer from 'inquirer';
import ora from 'ora';
import chalk from 'chalk';

export const createCommand = new Command('create')
  .argument('<name>', 'Project name')
  .action(async (name) => {
    console.log(chalk.bold('\n🚂 Vibe on Rails\n'));

    const answers = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'features',
        message: 'Features to enable:',
        choices: [
          { name: 'Payments (Stripe)', value: 'payments' },
          { name: 'Admin Panel', value: 'admin', checked: true },
          { name: 'Support (Helpdesk)', value: 'support' },
        ],
      },
    ]);

    const spinner = ora('Creating project...').start();
    await generateApp({ name, features: answers.features });
    spinner.succeed('Project created!');

    console.log(chalk.green('\n✅ Done!\n'));
    console.log(`  cd ${name}`);
    console.log('  npx vibe dev\n');
  });
```

### 6.3 Module Generator

```typescript
// packages/cli/src/generators/module.generator.ts
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import Handlebars from 'handlebars';

const TEMPLATES = {
  types: `import { z } from 'zod';

export const Create{{pascalName}}Schema = z.object({
  name: z.string().min(1).max(255),
});

export type Create{{pascalName}}Input = z.infer<typeof Create{{pascalName}}Schema>;
`,

  service: `import { db } from '@vibeonrails/core/database';
import { {{camelName}}s } from '../../database/schema';
import { eq } from 'drizzle-orm';
import type { Create{{pascalName}}Input } from './{{name}}.types';

export const {{camelName}}Service = {
  async findAll() {
    return db.query.{{camelName}}s.findMany();
  },
  async findById(id: string) {
    return db.query.{{camelName}}s.findFirst({ where: eq({{camelName}}s.id, id) });
  },
  async create(input: Create{{pascalName}}Input) {
    const [result] = await db.insert({{camelName}}s).values(input).returning();
    return result;
  },
};
`,

  controller: `import { router, publicProcedure, protectedProcedure } from '../../trpc';
import { {{camelName}}Service } from './{{name}}.service';
import { Create{{pascalName}}Schema } from './{{name}}.types';
import { z } from 'zod';

export const {{camelName}}Router = router({
  list: publicProcedure.query(() => {{camelName}}Service.findAll()),
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {{camelName}}Service.findById(input.id)),
  create: protectedProcedure
    .input(Create{{pascalName}}Schema)
    .mutation(({ input }) => {{camelName}}Service.create(input)),
});
`,
};

export async function generateModule(name: string) {
  const modulePath = join(process.cwd(), 'src', 'core', 'api', 'modules', name);
  await mkdir(modulePath, { recursive: true });

  const vars = {
    name,
    camelName: name.replace(/-([a-z])/g, (g) => g[1].toUpperCase()),
    pascalName: name.replace(/(^|-)([a-z])/g, (g) => g.slice(-1).toUpperCase()),
  };

  await writeFile(join(modulePath, `${name}.types.ts`), Handlebars.compile(TEMPLATES.types)(vars));
  await writeFile(join(modulePath, `${name}.service.ts`), Handlebars.compile(TEMPLATES.service)(vars));
  await writeFile(join(modulePath, `${name}.controller.ts`), Handlebars.compile(TEMPLATES.controller)(vars));

  console.log(`✅ Module "${name}" created at src/core/api/modules/${name}/`);
}
```

---

# Part III: Feature Packages

## Chapter 7: @vibeonrails/payments

```typescript
// packages/features/payments/src/checkout.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function createCheckout(options: {
  items: Array<{ priceId: string; quantity?: number }>;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: options.items.map((item) => ({
      price: item.priceId,
      quantity: item.quantity || 1,
    })),
    success_url: options.successUrl,
    cancel_url: options.cancelUrl,
  });

  return { sessionId: session.id, url: session.url };
}

// Webhook handling
const handlers = new Map<string, ((event: Stripe.Event) => Promise<void>)[]>();

export function on(eventType: string, handler: (event: Stripe.Event) => Promise<void>) {
  if (!handlers.has(eventType)) handlers.set(eventType, []);
  handlers.get(eventType)!.push(handler);
}

export async function handleWebhook(body: string, signature: string) {
  const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  const eventHandlers = handlers.get(event.type);
  if (eventHandlers) await Promise.all(eventHandlers.map((h) => h(event)));
}
```

## Chapter 8: @vibeonrails/admin

```tsx
// packages/features/admin/src/components/ResourceList.tsx
import { DataTable, Button, Input } from '@vibeonrails/web/components';

interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
}

export function ResourceList<T extends { id: string }>({
  resource,
  columns,
}: {
  resource: string;
  columns: Column<T>[];
}) {
  const { data, isLoading } = useResource<T>(resource);

  return (
    <div className="stack-6">
      <div className="row row-between">
        <Input placeholder="Search..." className="w-64" />
        <Button href={`/admin/${resource}/new`}>Create New</Button>
      </div>
      <DataTable data={data} columns={columns} loading={isLoading} />
    </div>
  );
}
```

---

# Part IV: Implementation Roadmap

## Phase 1: Foundation (Weeks 1-4)

- [ ] Set up monorepo (pnpm + Turborepo)
- [ ] Implement @vibeonrails/core (API, DB, Auth)
- [ ] Implement @vibeonrails/infra (Health, Logging, Queue, Email)
- [ ] Implement @vibeonrails/cli (create, generate commands)
- [ ] Create base app template

## Phase 2: Frontend (Weeks 5-8)

- [ ] Implement @vibeonrails/web (CSS system, components)
- [ ] Set up Vite + React
- [ ] Implement routing
- [ ] Implement tRPC client
- [ ] Build example pages

## Phase 3: Features (Weeks 9-12)

- [ ] Implement @vibeonrails/admin
- [ ] Implement @vibeonrails/payments
- [ ] Implement @vibeonrails/support (basic)
- [ ] Auto-generate admin from schema

## Phase 4: Polish (Weeks 13-16)

- [ ] Complete all SKILL.md files
- [ ] Build documentation site
- [ ] Write tutorials
- [ ] Comprehensive testing
- [ ] Performance optimization

## Phase 5: Launch (Weeks 17-20)

- [ ] Publish npm packages
- [ ] Launch docs site
- [ ] Example applications
- [ ] Community building

---

# Part V: CLI Commands Reference

```bash
# Project
npx create-vibe <name>          # Create new project

# Generate
npx vibe generate module <name>  # Generate API module
npx vibe generate component <name>  # Generate component
npx vibe g m <name>              # Shorthand

# Database
npx vibe db:migrate              # Run migrations
npx vibe db:seed                 # Run seeds
npx vibe db:reset                # Reset database

# Development
npx vibe dev                     # Start dev server
npx vibe dev:api                 # API only
npx vibe dev:web                 # Web only

# Production
npx vibe build                   # Build
npx vibe start                   # Start production

# Deploy
npx vibe deploy railway          # Deploy to Railway
npx vibe deploy fly              # Deploy to Fly.io
```

---

# Part VI: Package Dependencies

## @vibeonrails/core

```json
{
  "dependencies": {
    "hono": "^4.0.0",
    "@trpc/server": "^10.0.0",
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.0",
    "zod": "^3.22.0",
    "jose": "^5.2.0",
    "@node-rs/argon2": "^1.7.0"
  }
}
```

## @vibeonrails/infra

```json
{
  "dependencies": {
    "bullmq": "^5.0.0",
    "ioredis": "^5.3.0",
    "resend": "^2.0.0"
  }
}
```

## @vibeonrails/web

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "@trpc/react-query": "^10.0.0",
    "@tanstack/react-query": "^5.0.0",
    "zustand": "^4.5.0"
  }
}
```

## @vibeonrails/cli

```json
{
  "dependencies": {
    "commander": "^11.0.0",
    "inquirer": "^9.0.0",
    "chalk": "^5.0.0",
    "ora": "^8.0.0",
    "handlebars": "^4.7.0"
  }
}
```

---

# Part VII: Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp

# Auth
JWT_SECRET=your-secret-key-minimum-32-characters

# Redis
REDIS_URL=redis://localhost:6379

# Email
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=hello@myapp.com

# Storage
S3_BUCKET=myapp-uploads
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx

# Stripe (optional)
STRIPE_SECRET_KEY=sk_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
```

---

*This implementation guide provides the technical foundation for building Vibe on Rails. Each section can be expanded as development progresses.*