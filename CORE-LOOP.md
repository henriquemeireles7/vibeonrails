# VibeonRails Core Loop

> This document defines the product. Every implementation decision traces back here.

---

## The Core Loop

VibeonRails is not a collection of packages. It is a sequence of CLI commands
that build, run, and grow a business. The user experience IS the commands:

```
create-vibe my-app     →  Working app with everything a business needs
vibe companion         →  AI companion connected and monitoring
vibe sites             →  Landing page, docs, blog live
```

That's the product. Three commands. Three milestones.
Everything else is implementation detail.

---

## Command 1: `create-vibe` (BUILD)

### What the user gets

A complete, working, production-ready application. Not a starter template.
Not a demo. A real app that boots, serves pages, authenticates users,
accepts payments, logs events, checks health, and handles errors -- on day one.

### What gets generated

```
my-app/
├── .cursorrules                    # AI instructions for this project
├── .env.example                    # All environment variables documented
├── .vibe/
│   └── project.json                # Machine-readable project manifest
├── MANIFEST.md                     # Human+AI readable: everything that was generated
├── SKILL.md                        # AI discovery: what's available, how to extend
├── package.json
├── drizzle.config.ts
├── tsconfig.json
├── vite.config.ts
│
├── content/                        # Editable content (brand, emails, copy)
│   ├── brand/
│   │   ├── voice.md                # Brand voice guidelines
│   │   └── terminology.md          # Product terminology
│   ├── emails/
│   │   ├── welcome.md
│   │   ├── password-reset.md
│   │   └── email-verify.md
│   └── website/
│       ├── landing.md
│       ├── about.md
│       └── pricing.md
│
├── src/
│   ├── config/
│   │   ├── app.ts                  # App config (name, port, environment)
│   │   ├── database.ts             # Database client
│   │   └── env.ts                  # Zod-validated environment variables
│   │
│   ├── database/
│   │   └── seeds/
│   │       ├── development.ts      # Dev seed data
│   │       └── test.ts             # Test seed data
│   │
│   ├── middleware/                  # [NEW] Wired middleware (template layer)
│   │   ├── rate-limit.ts           # Rate limiting config (which paths, what limits)
│   │   ├── logging.ts              # Request logging config (what to redact)
│   │   └── health.ts               # Health check registration
│   │
│   ├── modules/
│   │   ├── auth/                   # Authentication (register, login, refresh, me)
│   │   │   ├── auth.types.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   └── auth.test.ts
│   │   ├── user/                   # User management (profile, list)
│   │   │   ├── user.types.ts
│   │   │   ├── user.service.ts
│   │   │   ├── user.controller.ts
│   │   │   └── user.test.ts
│   │   └── post/                   # Example CRUD module (delete and replace)
│   │       ├── post.types.ts
│   │       ├── post.service.ts
│   │       ├── post.controller.ts
│   │       └── post.test.ts
│   │
│   ├── main.ts                     # Server entry point (everything wired)
│   ├── router.ts                   # Root tRPC router
│   │
│   └── web/                        # Frontend
│       ├── App.tsx                  # React app with routing
│       ├── main.tsx                # Entry point
│       ├── components/             # Shared components
│       ├── pages/
│       │   ├── HomePage.tsx
│       │   ├── LoginPage.tsx
│       │   ├── RegisterPage.tsx
│       │   ├── DashboardPage.tsx
│       │   └── PostsPage.tsx
│       └── routes/
│           └── index.ts
│
└── index.html
```

### What's already wired (invisible layer, working on boot)

These are NOT optional. They are always on. The user doesn't configure them:

| Feature | What happens | Invisible layer |
|---------|-------------|-----------------|
| Auth security | Passwords hashed with Argon2, JWTs signed with jose | `@vibeonrails/core/security` |
| Rate limiting | Auth endpoints: 5 req/15min. API: 100 req/min. Headers set automatically | `@vibeonrails/core/rate-limit` |
| Error handling | Errors sanitized, no stack traces leaked, structured JSON responses | `@vibeonrails/core/errors` |
| CSRF protection | Double-submit cookie pattern on mutations | `@vibeonrails/core/security` |
| Structured logging | JSON logs with request ID, redacted sensitive fields | `@vibeonrails/infra/logging` |
| Health checks | `/health` endpoint with DB connectivity check | `@vibeonrails/infra/health` |
| Input validation | Every tRPC procedure validates with Zod | `@vibeonrails/core/api` |
| Error sanitization | Internal errors never reach the client | `@vibeonrails/core/errors` |

### What's ready to configure (template layer, user-editable)

These files exist in the project. The user can customize them:

| File | What it configures | Default behavior |
|------|-------------------|------------------|
| `src/middleware/rate-limit.ts` | Which paths to rate limit, custom limits | Auth + API presets applied |
| `src/middleware/logging.ts` | Which fields to redact, log level | Redacts passwords, tokens |
| `src/middleware/health.ts` | Which health checks to register | Database check registered |
| `src/config/env.ts` | Environment variable schema | Core vars validated |
| `content/emails/*.md` | Email templates | Welcome, password-reset, verify |
| `content/brand/voice.md` | Brand voice for AI content | Generic professional tone |

---

## The MANIFEST.md File

After `create-vibe` runs, one file explains everything. This is the single most
important file for AI comprehension. The AI reads this FIRST.

```markdown
# my-app — Generated by VibeonRails

## What was generated

This project was scaffolded by `create-vibe` on 2025-02-07.

### Server (src/main.ts)
- Hono HTTP server on port 3000
- tRPC router at /api/trpc
- CORS enabled for development
- Health endpoint at /health

### Modules
- **auth** — Register, login, JWT refresh, current user
- **user** — Profile view, user listing
- **post** — CRUD example with ownership checks (replace with your domain)

### Security (automatic, no configuration needed)
- Argon2 password hashing (from @vibeonrails/core/security)
- JWT access + refresh tokens (from @vibeonrails/core/security)
- CSRF double-submit cookies (from @vibeonrails/core/security)
- Rate limiting: 5 req/15min on auth, 100 req/min on API (from @vibeonrails/core/rate-limit)
- Error sanitization: no internal details leaked (from @vibeonrails/core/errors)
- Structured logging with sensitive field redaction (from @vibeonrails/infra/logging)

### Frontend (src/web/)
- React 18 with React Router
- Pages: Home, Login, Register, Dashboard, Posts
- CSS design system from @vibeonrails/web/styles
- tRPC client wired to backend

### Database
- Drizzle ORM with PostgreSQL
- Tables: users, posts
- Seeds for development and test environments

### Content
- Email templates: welcome, password-reset, email-verify
- Brand guidelines: voice, terminology
- Website copy: landing, about, pricing

## How to extend

| I want to... | Command |
|--------------|---------|
| Add a new module | `vibe generate module <name>` |
| Add payments | `vibe add payments` |
| Add admin panel | `vibe add admin` |
| Add marketing | `vibe add marketing` |
| See all available modules | `vibe modules list` |

## Import map

Every import from @vibeonrails is documented below.
Read these annotations to understand what each import provides.

(See "AI-First Import Annotations" section below)
```

---

## AI-First Import Annotations

Every generated file that imports from @vibeonrails MUST have a comment block
explaining what was imported. This is the bridge between "we have powerful tools"
and "AI knows what they do."

### The Rule

Every import from `@vibeonrails/*` in a generated template file gets an
annotation comment above it:

```typescript
// ---------------------------------------------------------------------------
// @vibeonrails/core/security — Authentication & Cryptography
//
// hashPassword(plain): Hash with Argon2id (memory: 64MB, iterations: 3).
//   Returns string hash. Never stores plain text.
// verifyPassword(hash, plain): Constant-time comparison. Returns boolean.
// signAccessToken(payload): Signs JWT with RS256. Expires in 15 minutes.
// signRefreshToken(payload): Signs JWT with RS256. Expires in 7 days.
// ---------------------------------------------------------------------------
import {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
} from '@vibeonrails/core/security';
```

### Why this matters

1. AI agents read the source file, not the documentation site
2. When AI sees `hashPassword()`, it knows it uses Argon2 -- it won't replace it with bcrypt
3. When AI extends the module, it knows what functions are available without searching
4. The annotation IS the documentation, colocated with the code

### Template for import annotations

```
// ---------------------------------------------------------------------------
// @vibeonrails/{package}/{subpath} — {One-Line Description}
//
// {functionName}({params}): {What it does}. {Key detail AI should know}.
// {functionName}({params}): {What it does}. {Key detail AI should know}.
// {CONSTANT_NAME}: {What it is}. {Key detail AI should know}.
// ---------------------------------------------------------------------------
```

### Example: Rate Limiting

```typescript
// ---------------------------------------------------------------------------
// @vibeonrails/core/rate-limit — Sliding Window Rate Limiter
//
// createRateLimitMiddleware(opts): Hono middleware that checks rate limits,
//   sets X-RateLimit-Limit/Remaining/Reset headers, returns 429 when exceeded.
//   opts.limiter: RateLimiter instance (Redis or in-memory).
//   opts.skipPaths: Paths to exclude (e.g., ['/health']).
//   opts.keyGenerator: Custom key function (default: IP address).
// createInMemoryRateLimiter(config): In-memory limiter for dev/test.
//   Not suitable for production multi-instance deployments.
// createRedisRateLimiter(redis, config): Redis-backed sliding window limiter.
//   Production-ready. Handles multi-instance correctly.
// AUTH_RATE_LIMIT: Preset config — 5 requests per 15 minutes.
// API_RATE_LIMIT: Preset config — 100 requests per 60 seconds.
// ---------------------------------------------------------------------------
import {
  createRateLimitMiddleware,
  createInMemoryRateLimiter,
  AUTH_RATE_LIMIT,
  API_RATE_LIMIT,
} from '@vibeonrails/core/rate-limit';
```

---

## Command 2: `vibe companion` (RUN)

After the app is created, the user connects their AI companion:

```bash
vibe companion setup
```

This command:
1. Detects or provisions an OpenClaw instance
2. Installs VibeonRails skills (project, marketing, support, finance, analytics)
3. Connects to Discord (or other platform)
4. Posts an introduction message with available commands
5. Saves config to `.vibe/companion.json`

The companion can then:
- Monitor the app (health, errors, metrics)
- Run marketing tasks (generate content, post to channels)
- Handle support (respond to tickets, classify feedback)
- Report financials (MRR, churn, revenue)

---

## Command 3: `vibe sites` (GROW)

After the app is running and companion is connected:

```bash
vibe sites init
```

This command:
1. Asks what sites to enable (landing, blog, docs, help, changelog, status)
2. Generates site configuration
3. Uses content from `content/website/` as source material
4. Sets up build pipeline

---

## Package Architecture

### Packages (npm, versioned, imported — the Invisible Layer)

These are what the user installs. They never edit these files.

| Package | What it provides |
|---------|-----------------|
| `@vibeonrails/core` | Server runtime: API (Hono + tRPC), Database (Drizzle), Security (JWT, Argon2, CSRF, sessions, OAuth), Config, Errors, Rate Limiting, Webhooks |
| `@vibeonrails/infra` | Infrastructure: Logging, Health, Queue/Cron, Email, Cache, Storage, Realtime, Monitoring, Analytics, Feature Flags |
| `@vibeonrails/web` | Frontend: CSS design system, React components, hooks, routing |
| `@vibeonrails/cli` | CLI tool: create, generate, add, dev, build, db, companion, sites |
| `@vibeonrails/docs` | Documentation: Starlight presets, MDX components, plugins |
| `@vibeonrails/test` | Test utilities: factories, fixtures, mocks, assertions |

### Feature Modules (templates, installed via `vibe add` — the Template Layer)

These are NOT separate npm packages in the long run. They are template code
that gets copied into the user's project. The user owns and edits these files.

The invisible layer code they depend on lives inside `@vibeonrails/core`,
`@vibeonrails/infra`, or `@vibeonrails/web`.

| Module | Installed via | What the user gets (template) | What's invisible (package) |
|--------|--------------|-------------------------------|---------------------------|
| `payments` | `vibe add payments` | Checkout page, pricing config, webhook handler | Stripe SDK wrapper, idempotency, subscription state machine |
| `admin` | `vibe add admin` | Admin layout, resource views | Auto-CRUD generation, data introspection |
| `marketing` | `vibe add marketing` | Content templates, channel config | Heuristic engine, AI generation, channel posting |
| `sales` | `vibe add sales` | CRM views, outreach templates | Lead scoring, sequence engine |
| `support-chat` | `vibe add support-chat` | Chat widget, response templates | SSE streaming, AI classification |
| `support-feedback` | `vibe add support-feedback` | Feedback form, dashboard | Classification engine, task creation |
| `finance` | `vibe add finance` | Report views, invoice templates | MRR calculation, data source aggregation |
| `notifications` | `vibe add notifications` | Notification preferences UI | Multi-channel dispatch, delivery tracking |

### The Difference

**Package** = Code the user IMPORTS. Lives in `node_modules`. Versioned on npm.
The user never edits it. It's the invisible layer.

**Feature Module** = Code the user OWNS. Lives in their `src/modules/` directory.
Generated by `vibe add`. The user edits it. It's the template layer.

The template layer IMPORTS FROM the invisible layer.
That's the entire architecture in one sentence.

---

## What `create-vibe` Must Generate vs What It Currently Generates

### Currently generates (what exists)
- [x] Auth module (register, login, refresh, me)
- [x] User module (profile, list)
- [x] Post module (CRUD example)
- [x] Database config + seeds
- [x] Environment validation
- [x] Frontend pages (Home, Login, Register, Dashboard, Posts)
- [x] SKILL.md with package reference table
- [x] .cursorrules for AI
- [x] .plan/ directory with project context

### Must also generate (what's missing)
- [ ] `MANIFEST.md` — Human+AI summary of everything generated
- [ ] `src/middleware/rate-limit.ts` — Rate limiting wired and configured
- [ ] `src/middleware/logging.ts` — Structured logging wired and configured
- [ ] `src/middleware/health.ts` — Health checks registered
- [ ] AI-first import annotations on every @vibeonrails import
- [ ] `src/main.ts` updated to wire all middleware
- [ ] Health endpoint (`/health`) actually working
- [ ] `.vibe/project.json` generated on create (not just as a later command)

### Should NOT generate yet (install via `vibe add` later)
- Payments (Stripe) — not every app needs payments on day one
- Admin panel — useful but not essential for launch
- Marketing, sales, support, finance — business growth features

---

## The Core Loop Defined

```
User runs: create-vibe my-habit-tracker
  ↓
Framework generates: complete working app
  ↓
Framework generates: MANIFEST.md explaining everything
  ↓
User opens in Cursor
  ↓
AI reads: MANIFEST.md + SKILL.md + .cursorrules
  ↓
AI understands: the entire project, what's available, how to extend
  ↓
User says: "replace the post module with habits"
  ↓
AI: reads import annotations, understands the invisible layer,
    generates correct code that uses the framework properly
  ↓
User says: "add payments"
  ↓
AI: runs `vibe add payments`, reads the new SKILL.md,
    wires it into the existing app
```

The core loop is:
1. **Generate** — CLI creates the scaffolding
2. **Explain** — Manifest + annotations tell AI what exists
3. **Extend** — AI builds on the foundation correctly

If step 2 fails (AI doesn't understand what was generated),
step 3 will always produce bad code. That's why the manifest
and import annotations are not nice-to-haves. They ARE the product.

---

## Implementation Priority

Phase 1: Make `create-vibe` generate a complete, working app
  1. Add middleware/ template files (rate-limit, logging, health)
  2. Add AI-first import annotations to all template files
  3. Generate MANIFEST.md
  4. Wire everything in main.ts
  5. Ensure `vibe dev` boots and all features work

Phase 2: Make `vibe companion` connect and work
  1. Add `vibe companion` CLI command
  2. Setup flow (detect/provision OpenClaw)
  3. Skill installation
  4. First-run introduction

Phase 3: Make `vibe sites` generate and deploy
  1. Add `vibe sites` CLI command
  2. Site generation from content/
  3. Build pipeline

Each phase is complete when a user can run the command and get
a working result. No half-implementations. No stubs. No TODOs.
