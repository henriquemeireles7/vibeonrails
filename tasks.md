# Agent on Rails — Remaining Tasks

> Each task = one file change. Organized by project.
> Status: `[ ]` = not started, `[x]` = done

---

## Project 1: @aor/core — Remaining Framework Gaps

> What exists: API (server, trpc, context, router, middleware), Database (client, migrate, schema), Security (jwt, password, guards), Shared (errors, types, utils)
> What's missing: database seeds/repos, session auth, OAuth, crypto utils, CSRF, audit logging

### Database — Seeds Infrastructure

- [ ] `packages/core/src/database/seeds/development.ts` — Development seed data (sample users, posts)
- [ ] `packages/core/src/database/seeds/test.ts` — Test seed data (minimal fixtures)
- [ ] `packages/core/src/database/seeds/index.ts` — Seed runner (runSeeds function)
- [ ] `packages/core/src/database/seeds/seeds.test.ts` — Tests for seed runner

### Database — Repository Pattern

- [ ] `packages/core/src/database/repositories/user.repository.ts` — User CRUD queries (findById, findByEmail, create, update)
- [ ] `packages/core/src/database/repositories/post.repository.ts` — Post CRUD queries (findAll, findById, create, update, delete)
- [ ] `packages/core/src/database/repositories/index.ts` — Repository barrel export
- [ ] `packages/core/src/database/repositories/user.repository.test.ts` — User repository tests
- [ ] `packages/core/src/database/repositories/post.repository.test.ts` — Post repository tests
- [ ] `packages/core/src/database/index.ts` — Update to export repositories and seeds

### Security — Session Management

- [ ] `packages/core/src/security/auth/sessions.ts` — Session create/validate/revoke with Redis backing
- [ ] `packages/core/src/security/auth/sessions.test.ts` — Session management tests
- [ ] `packages/core/src/security/auth/index.ts` — Update to export sessions

### Security — OAuth Providers

- [ ] `packages/core/src/security/auth/oauth.ts` — OAuth provider config (Google, GitHub, Discord)
- [ ] `packages/core/src/security/auth/oauth.test.ts` — OAuth flow tests
- [ ] `packages/core/src/security/auth/index.ts` — Update to export oauth

### Security — Crypto Utilities

- [ ] `packages/core/src/security/crypto/encrypt.ts` — AES-256-GCM encrypt/decrypt functions
- [ ] `packages/core/src/security/crypto/hash.ts` — SHA-256 hashing utilities
- [ ] `packages/core/src/security/crypto/tokens.ts` — Secure random token generation (email verify, password reset)
- [ ] `packages/core/src/security/crypto/index.ts` — Crypto barrel export
- [ ] `packages/core/src/security/crypto/crypto.test.ts` — Crypto utility tests
- [ ] `packages/core/src/security/index.ts` — Update to export crypto module

### Security — CSRF Protection

- [ ] `packages/core/src/security/middleware/csrf.ts` — CSRF token middleware for Hono
- [ ] `packages/core/src/security/middleware/csrf.test.ts` — CSRF middleware tests
- [ ] `packages/core/src/security/middleware/index.ts` — Security middleware barrel export
- [ ] `packages/core/src/security/index.ts` — Update to export security middleware

### Security — Audit Logging

- [ ] `packages/core/src/security/audit/logger.ts` — Audit log for auth events (login, logout, password change, role change)
- [ ] `packages/core/src/security/audit/logger.test.ts` — Audit logger tests
- [ ] `packages/core/src/security/audit/index.ts` — Audit barrel export
- [ ] `packages/core/src/security/index.ts` — Update to export audit module

### Core — Package Exports Update

- [ ] `packages/core/tsup.config.ts` — Add new entry points for crypto, audit if sub-path exports needed

---

## Project 2: @aor/infra — Remaining Framework Gaps

> What exists: Health, Logging, Queue (jobs), Email, Cache, Storage
> What's missing: cron jobs, realtime/WebSockets, monitoring/metrics

### Queue — Cron Job Support

- [ ] `packages/infra/src/queue/cron.ts` — defineCron() function with schedule parsing
- [ ] `packages/infra/src/queue/cron.test.ts` — Cron definition tests
- [ ] `packages/infra/src/queue/index.ts` — Update to export cron

### Realtime — WebSocket Module

- [ ] `packages/infra/src/realtime/server.ts` — WebSocket server setup (Hono WebSocket adapter)
- [ ] `packages/infra/src/realtime/channels.ts` — Channel subscription management (subscribe, broadcast, unsubscribe)
- [ ] `packages/infra/src/realtime/index.ts` — Realtime barrel export
- [ ] `packages/infra/src/realtime/realtime.test.ts` — Realtime module tests

### Monitoring — Metrics & Tracing

- [ ] `packages/infra/src/monitoring/metrics.ts` — Counter, histogram, gauge metric collection
- [ ] `packages/infra/src/monitoring/tracing.ts` — Request tracing with trace ID propagation
- [ ] `packages/infra/src/monitoring/index.ts` — Monitoring barrel export
- [ ] `packages/infra/src/monitoring/metrics.test.ts` — Metrics tests

### Infra — Package Updates

- [ ] `packages/infra/tsup.config.ts` — Add realtime and monitoring entry points
- [ ] `packages/infra/package.json` — Add WebSocket dependencies if needed
- [ ] `packages/infra/src/index.ts` — Update to export realtime and monitoring
- [ ] `packages/infra/SKILL.md` — Update to document new modules

---

## Project 3: @aor/cli — New Package (Developer Experience)

> This is what makes the framework usable. `npx create-aor my-app` and `npx aor generate module user`.

### Package Setup

- [x] `packages/cli/package.json` — Package config with commander, chalk, ora, handlebars deps
- [x] `packages/cli/tsconfig.json` — TypeScript config extending root
- [x] `packages/cli/tsup.config.ts` — Build config for CLI binary
- [x] `packages/cli/vitest.config.ts` — Test config

### Binary Entry Point

- [x] `packages/cli/bin/aor.js` — CLI entry point (#!/usr/bin/env node, loads dist/index.js)
- [x] `packages/cli/bin/create-aor.js` — create-aor entry point

### CLI Main Router

- [x] `packages/cli/src/index.ts` — Commander program setup, registers all commands

### Commands

- [x] `packages/cli/src/commands/create.ts` — `npx create-aor <name>` — scaffold new project from app template
- [x] `packages/cli/src/commands/generate.ts` — `npx aor generate module|component <name>` — generate code from templates
- [x] `packages/cli/src/commands/dev.ts` — `npx aor dev` — start dev server (API + web concurrently)
- [x] `packages/cli/src/commands/db.ts` — `npx aor db:migrate|seed|reset` — database operations
- [x] `packages/cli/src/commands/build.ts` — `npx aor build` — production build
- [x] `packages/cli/src/commands/deploy.ts` — `npx aor deploy railway|fly` — deploy to cloud (placeholder)

### Generators

- [x] `packages/cli/src/generators/app.generator.ts` — Copy app template, replace placeholders, install deps
- [x] `packages/cli/src/generators/module.generator.ts` — Generate types + service + controller + test for an API module
- [ ] `packages/cli/src/generators/component.generator.ts` — Generate React component from template (needs @aor/web first)

### Utilities

- [x] `packages/cli/src/utils/template.ts` — Handlebars template helpers (pascalCase, camelCase, etc.)
- [x] `packages/cli/src/utils/fs.ts` — File system helpers (copyDir, replaceInFile, ensureDir)

### Tests

- [x] `packages/cli/src/generators/module.generator.test.ts` — Module generator tests
- [x] `packages/cli/src/generators/app.generator.test.ts` — App generator tests
- [x] `packages/cli/src/utils/template.test.ts` — Template helper tests
- [x] `packages/cli/src/utils/fs.test.ts` — FS helper tests

### Docs

- [x] `packages/cli/SKILL.md` — CLI skill document

### Monorepo Config

- [x] `pnpm-workspace.yaml` — Verified packages/cli is included via packages/*

---

## Project 4: @aor/web — New Package (Frontend)

> CSS system, React components, hooks, tRPC client. Published as `@aor/web`.

### Package Setup

- [ ] `packages/web/package.json` — Package config with React 19, @trpc/react-query, zustand, @tanstack/react-query
- [ ] `packages/web/tsconfig.json` — TypeScript config with JSX support
- [ ] `packages/web/tsup.config.ts` — Build config with multiple entry points
- [ ] `packages/web/vitest.config.ts` — Test config

### CSS System — Design Tokens

- [ ] `packages/web/src/styles/tokens.css` — CSS custom properties (colors, spacing, typography, radius, shadows, dark mode)
- [ ] `packages/web/src/styles/layout.css` — Layout utilities (.stack, .row, .row-between, .row-center, gap classes)
- [ ] `packages/web/src/styles/components.css` — Component classes (.btn, .btn-primary, .input, .card, .badge, etc.)
- [ ] `packages/web/src/styles/motion.css` — Animation utilities (transitions, keyframes)

### UI Components

- [ ] `packages/web/src/components/ui/Button.tsx` — Button component (primary, secondary, ghost variants + sizes + loading)
- [ ] `packages/web/src/components/ui/Input.tsx` — Input component (text, email, password, with label + error)
- [ ] `packages/web/src/components/ui/Select.tsx` — Select dropdown component
- [ ] `packages/web/src/components/ui/Modal.tsx` — Modal/dialog component with overlay
- [ ] `packages/web/src/components/ui/Toast.tsx` — Toast notification component (success, error, info)
- [ ] `packages/web/src/components/ui/index.ts` — UI components barrel export

### Form Components

- [ ] `packages/web/src/components/forms/FormField.tsx` — FormField wrapper (label + input + error message)
- [ ] `packages/web/src/components/forms/index.ts` — Forms barrel export

### Data Display Components

- [ ] `packages/web/src/components/data/DataTable.tsx` — Data table with sorting, pagination
- [ ] `packages/web/src/components/data/Card.tsx` — Card component
- [ ] `packages/web/src/components/data/List.tsx` — List component
- [ ] `packages/web/src/components/data/index.ts` — Data components barrel export

### Layout Components

- [ ] `packages/web/src/components/layout/PageLayout.tsx` — Page layout with header + sidebar + content
- [ ] `packages/web/src/components/layout/Header.tsx` — App header (logo, nav, user menu)
- [ ] `packages/web/src/components/layout/Sidebar.tsx` — Sidebar navigation
- [ ] `packages/web/src/components/layout/index.ts` — Layout components barrel export

### Hooks

- [ ] `packages/web/src/hooks/useApi.ts` — tRPC client hook setup (createTRPCReact, QueryClient provider)
- [ ] `packages/web/src/hooks/useAuth.ts` — Zustand auth store (user, token, login, logout, isAuthenticated)
- [ ] `packages/web/src/hooks/index.ts` — Hooks barrel export

### Routing

- [ ] `packages/web/src/routing/defineRoutes.ts` — Type-safe route definition helper
- [ ] `packages/web/src/routing/index.ts` — Routing barrel export

### Package Entry

- [ ] `packages/web/src/index.ts` — Main barrel export for entire @aor/web package

### Tests

- [ ] `packages/web/src/components/ui/Button.test.tsx` — Button component tests
- [ ] `packages/web/src/components/ui/Input.test.tsx` — Input component tests
- [ ] `packages/web/src/hooks/useAuth.test.ts` — Auth hook tests

### Docs

- [ ] `packages/web/SKILL.md` — Web package skill document

---

## Project 5: App Template — What `create-aor` Scaffolds

> This is the starter project a real developer gets when they run `npx create-aor my-app`.

### Root Config

- [ ] `templates/app/package.json.hbs` — Template package.json with @aor/core, @aor/infra, @aor/web deps
- [ ] `templates/app/tsconfig.json` — App-level TypeScript config
- [ ] `templates/app/.env.example` — Environment variables template
- [ ] `templates/app/.gitignore` — Git ignore for generated app
- [ ] `templates/app/drizzle.config.ts` — Drizzle Kit migration config

### App Entry

- [ ] `templates/app/src/main.ts` — App entry point (creates server, starts listening on port)
- [ ] `templates/app/src/router.ts` — Main tRPC router (imports and merges all module routers)

### Config

- [ ] `templates/app/src/config/app.ts` — App config (name, port, env)
- [ ] `templates/app/src/config/database.ts` — Database config (creates db instance from @aor/core)
- [ ] `templates/app/src/config/env.ts` — Env validation with Zod

### Auth Module (built-in)

- [ ] `templates/app/src/core/api/modules/auth/auth.types.ts` — LoginSchema, RegisterSchema, RefreshSchema
- [ ] `templates/app/src/core/api/modules/auth/auth.service.ts` — register, login, refreshToken, logout logic
- [ ] `templates/app/src/core/api/modules/auth/auth.controller.ts` — tRPC router: register, login, refresh, me
- [ ] `templates/app/src/core/api/modules/auth/auth.test.ts` — Auth endpoint tests

### User Module (built-in)

- [ ] `templates/app/src/core/api/modules/user/user.types.ts` — UpdateUserSchema, user Zod schemas
- [ ] `templates/app/src/core/api/modules/user/user.service.ts` — CRUD operations using userRepository
- [ ] `templates/app/src/core/api/modules/user/user.controller.ts` — tRPC router: getProfile, updateProfile, listUsers(admin)
- [ ] `templates/app/src/core/api/modules/user/user.test.ts` — User endpoint tests

### Post Module (example)

- [ ] `templates/app/src/core/api/modules/post/post.types.ts` — CreatePostSchema, UpdatePostSchema
- [ ] `templates/app/src/core/api/modules/post/post.service.ts` — CRUD operations with ownership checks
- [ ] `templates/app/src/core/api/modules/post/post.controller.ts` — tRPC router: list, getById, create, update, delete
- [ ] `templates/app/src/core/api/modules/post/post.test.ts` — Post endpoint tests

### Database Seeds

- [ ] `templates/app/src/core/database/seeds/development.ts` — Dev seed: sample admin + regular user + posts
- [ ] `templates/app/src/core/database/seeds/test.ts` — Test seed: minimal fixtures

### Frontend (web)

- [ ] `templates/app/src/web/App.tsx` — React app entry with router + providers
- [ ] `templates/app/src/web/pages/HomePage.tsx` — Landing page
- [ ] `templates/app/src/web/pages/LoginPage.tsx` — Login form page
- [ ] `templates/app/src/web/pages/RegisterPage.tsx` — Register form page
- [ ] `templates/app/src/web/pages/DashboardPage.tsx` — Authenticated dashboard
- [ ] `templates/app/src/web/pages/PostsPage.tsx` — Posts list page
- [ ] `templates/app/src/web/pages/PostPage.tsx` — Single post view
- [ ] `templates/app/src/web/routes/index.ts` — Route definitions (defineRoutes)
- [ ] `templates/app/vite.config.ts` — Vite config for frontend build
- [ ] `templates/app/index.html` — HTML entry point for Vite

### SKILL.md Files

- [ ] `templates/app/SKILL.md` — Root project skill
- [ ] `templates/app/src/core/api/SKILL.md` — API skill (how to create modules)
- [ ] `templates/app/src/core/api/modules/SKILL.md` — Modules skill (module creation pattern)
- [ ] `templates/app/src/core/database/SKILL.md` — Database skill (schema + migrations + seeds)
- [ ] `templates/app/src/core/security/SKILL.md` — Security skill (auth patterns)
- [ ] `templates/app/src/web/SKILL.md` — Web frontend skill
- [ ] `templates/app/src/web/components/SKILL.md` — Components skill

### Planning System

- [ ] `templates/app/.plan/SKILL.md` — How to use the planning system
- [ ] `templates/app/.plan/PROJECT.md` — Project overview template
- [ ] `templates/app/.plan/CONTEXT.md` — AI context template
- [ ] `templates/app/.plan/ROADMAP.md` — Roadmap template
- [ ] `templates/app/.plan/CURRENT.md` — Current sprint template
- [ ] `templates/app/.plan/DECISIONS.md` — Decision log template

---

## Project 6: Module Template — What `aor generate module` Creates

- [ ] `templates/module/{{name}}.types.ts.hbs` — Zod schemas (Create + Update)
- [ ] `templates/module/{{name}}.service.ts.hbs` — Service with CRUD methods
- [ ] `templates/module/{{name}}.controller.ts.hbs` — tRPC router wiring service to endpoints
- [ ] `templates/module/{{name}}.test.ts.hbs` — Test file with basic CRUD tests
- [ ] `templates/module/SKILL.md.hbs` — Module-specific SKILL.md

---

## Project 7: Component Template — What `aor generate component` Creates

- [ ] `templates/component/{{Name}}.tsx.hbs` — React component template
- [ ] `templates/component/{{Name}}.test.tsx.hbs` — Component test template

---

## Project 8: @aor/payments — Feature Package (Stripe)

### Package Setup

- [ ] `packages/features/payments/package.json` — Package config with stripe dependency
- [ ] `packages/features/payments/tsconfig.json` — TypeScript config
- [ ] `packages/features/payments/tsup.config.ts` — Build config

### Implementation

- [ ] `packages/features/payments/src/checkout.ts` — createCheckout() for one-time payments
- [ ] `packages/features/payments/src/subscription.ts` — createSubscription(), cancelSubscription(), changeplan()
- [ ] `packages/features/payments/src/customer.ts` — createCustomer(), getCustomer(), customer portal URL
- [ ] `packages/features/payments/src/webhook.ts` — Webhook handler with event type registry (on/handleWebhook)
- [ ] `packages/features/payments/src/index.ts` — Barrel export

### Tests

- [ ] `packages/features/payments/src/checkout.test.ts` — Checkout tests (mocked Stripe)
- [ ] `packages/features/payments/src/webhook.test.ts` — Webhook handler tests

### Docs

- [ ] `packages/features/payments/SKILL.md` — Payments skill document

---

## Project 9: @aor/admin — Feature Package (Admin Panel)

### Package Setup

- [ ] `packages/features/admin/package.json` — Package config (depends on @aor/web)
- [ ] `packages/features/admin/tsconfig.json` — TypeScript config
- [ ] `packages/features/admin/tsup.config.ts` — Build config

### Components

- [ ] `packages/features/admin/src/components/AdminLayout.tsx` — Admin panel layout (sidebar + content)
- [ ] `packages/features/admin/src/components/ResourceList.tsx` — Auto-generated list view with search/filter/pagination
- [ ] `packages/features/admin/src/components/ResourceForm.tsx` — Auto-generated create/edit form from schema
- [ ] `packages/features/admin/src/components/ResourceDetail.tsx` — Auto-generated detail view
- [ ] `packages/features/admin/src/components/Dashboard.tsx` — Admin dashboard with stats

### Core

- [ ] `packages/features/admin/src/config.ts` — Admin config (defineAdmin, resource registration)
- [ ] `packages/features/admin/src/routes.ts` — Admin route generation (/admin/:resource, /admin/:resource/new, etc.)
- [ ] `packages/features/admin/src/hooks/useResource.ts` — Hook for fetching/mutating admin resources
- [ ] `packages/features/admin/src/index.ts` — Barrel export

### Tests

- [ ] `packages/features/admin/src/components/ResourceList.test.tsx` — ResourceList tests

### Docs

- [ ] `packages/features/admin/SKILL.md` — Admin skill document

---

## Project 10: @aor/support — Feature Package (Helpdesk)

### Package Setup

- [ ] `packages/features/support/package.json` — Package config
- [ ] `packages/features/support/tsconfig.json` — TypeScript config
- [ ] `packages/features/support/tsup.config.ts` — Build config

### Implementation

- [ ] `packages/features/support/src/knowledge-base/loader.ts` — Load Markdown knowledge base articles
- [ ] `packages/features/support/src/tickets/ticket.service.ts` — Ticket CRUD (create, assign, resolve, close)
- [ ] `packages/features/support/src/tickets/ticket.types.ts` — Ticket schemas
- [ ] `packages/features/support/src/chat/ChatWidget.tsx` — Embeddable chat widget component
- [ ] `packages/features/support/src/chat/chat.service.ts` — Chat message handling + AI routing
- [ ] `packages/features/support/src/index.ts` — Barrel export

### Docs

- [ ] `packages/features/support/SKILL.md` — Support skill document

---

## Project 11: @aor/sales — Feature Package (AI Sales Agent)

### Package Setup

- [ ] `packages/features/sales/package.json` — Package config
- [ ] `packages/features/sales/tsconfig.json` — TypeScript config
- [ ] `packages/features/sales/tsup.config.ts` — Build config

### Implementation

- [ ] `packages/features/sales/src/config.ts` — Sales agent config (name, tone, channels, qualification questions)
- [ ] `packages/features/sales/src/agent.ts` — AI sales agent logic (FAQ, qualify, book demo, handoff)
- [ ] `packages/features/sales/src/channels/webchat.ts` — Webchat channel integration
- [ ] `packages/features/sales/src/channels/whatsapp.ts` — WhatsApp channel integration
- [ ] `packages/features/sales/src/channels/telegram.ts` — Telegram channel integration
- [ ] `packages/features/sales/src/index.ts` — Barrel export

### Docs

- [ ] `packages/features/sales/SKILL.md` — Sales skill document

---

## Project 12: @aor/marketing — Feature Package (Marketing Automation)

### Package Setup

- [ ] `packages/features/marketing/package.json` — Package config
- [ ] `packages/features/marketing/tsconfig.json` — TypeScript config
- [ ] `packages/features/marketing/tsup.config.ts` — Build config

### Implementation

- [ ] `packages/features/marketing/src/content/generate.ts` — AI content generation (social posts, emails)
- [ ] `packages/features/marketing/src/social/schedule.ts` — Multi-platform social media scheduling
- [ ] `packages/features/marketing/src/social/platforms.ts` — Platform adapters (Twitter, LinkedIn)
- [ ] `packages/features/marketing/src/sequences/define.ts` — defineSequence() for email drip campaigns
- [ ] `packages/features/marketing/src/sequences/runner.ts` — Sequence execution engine
- [ ] `packages/features/marketing/src/index.ts` — Barrel export

### Docs

- [ ] `packages/features/marketing/SKILL.md` — Marketing skill document

---

## Project 13: Content System — Email & Website Templates

> These go inside the app template. Content is separate from code.

### Email Templates

- [ ] `templates/app/content/locales/en/emails/welcome.md` — Welcome email template
- [ ] `templates/app/content/locales/en/emails/password-reset.md` — Password reset email template
- [ ] `templates/app/content/locales/en/emails/email-verify.md` — Email verification template
- [ ] `templates/app/content/locales/en/emails/invoice.md` — Invoice email template

### Website Content

- [ ] `templates/app/content/locales/en/website/landing.md` — Landing page copy
- [ ] `templates/app/content/locales/en/website/pricing.md` — Pricing page copy
- [ ] `templates/app/content/locales/en/website/about.md` — About page copy

### App Content

- [ ] `templates/app/content/locales/en/app/onboarding.md` — Onboarding flow copy
- [ ] `templates/app/content/locales/en/app/errors.md` — User-facing error messages

### Brand

- [ ] `templates/app/content/brand/voice.md` — Brand voice guidelines
- [ ] `templates/app/content/brand/terminology.md` — Product terminology glossary

### Content SKILL

- [ ] `templates/app/content/SKILL.md` — How to work with the content system

---

## Project 14: Documentation Site

### Setup

- [ ] `docs/package.json` — Docs site package (Astro or similar SSG)
- [ ] `docs/astro.config.ts` — SSG configuration

### Pages

- [ ] `docs/src/pages/index.md` — Documentation home page
- [ ] `docs/src/pages/getting-started.md` — Quick start guide (create project, add module, run dev)
- [ ] `docs/src/pages/core/api.md` — @aor/core API reference
- [ ] `docs/src/pages/core/database.md` — Database module reference
- [ ] `docs/src/pages/core/security.md` — Security module reference
- [ ] `docs/src/pages/infra/overview.md` — @aor/infra overview
- [ ] `docs/src/pages/web/css-system.md` — CSS system documentation
- [ ] `docs/src/pages/web/components.md` — Component library reference
- [ ] `docs/src/pages/cli/commands.md` — CLI commands reference
- [ ] `docs/src/pages/features/payments.md` — Payments feature docs
- [ ] `docs/src/pages/features/admin.md` — Admin feature docs
- [ ] `docs/src/pages/tutorials/first-module.md` — Tutorial: Create your first module
- [ ] `docs/src/pages/tutorials/authentication.md` — Tutorial: Add authentication
- [ ] `docs/src/pages/tutorials/deploy.md` — Tutorial: Deploy to production

---

## Project 15: Example Applications

### Basic Example

- [ ] `examples/basic/package.json` — Minimal AoR app (auth + posts)
- [ ] `examples/basic/src/main.ts` — App entry
- [ ] `examples/basic/src/router.ts` — Router with auth + post modules
- [ ] `examples/basic/README.md` — How to run the example

### Full SaaS Example

- [ ] `examples/saas/package.json` — Full SaaS app (auth, users, posts, payments, admin)
- [ ] `examples/saas/src/main.ts` — App entry
- [ ] `examples/saas/src/router.ts` — Router with all modules
- [ ] `examples/saas/README.md` — How to run the example

---

## Project 16: @aor/mobile — Future Package (React Native)

> Lower priority. Listed for completeness from vision doc.

- [ ] `packages/mobile/package.json` — Package config with React Native deps
- [ ] `packages/mobile/tsconfig.json` — TypeScript config
- [ ] `packages/mobile/src/components/index.ts` — Mobile component exports
- [ ] `packages/mobile/src/screens/index.ts` — Screen component exports
- [ ] `packages/mobile/src/navigation/index.ts` — Navigation setup
- [ ] `packages/mobile/src/index.ts` — Barrel export
- [ ] `packages/mobile/SKILL.md` — Mobile skill document

---

## Summary — Build Order (Recommended)

| Priority | Project | Why |
|----------|---------|-----|
| 1 | **Project 3: @aor/cli** | Without the CLI, nobody can use the framework |
| 2 | **Project 5: App Template** | What the CLI scaffolds — makes the framework real |
| 3 | **Project 6: Module Template** | What `aor generate module` produces |
| 4 | **Project 4: @aor/web** | Frontend components + CSS system |
| 5 | **Project 1: @aor/core gaps** | Repos, seeds, sessions, OAuth, crypto |
| 6 | **Project 2: @aor/infra gaps** | Cron, realtime, monitoring |
| 7 | **Project 13: Content System** | Email/website templates for the app template |
| 8 | **Project 8: @aor/payments** | First feature package |
| 9 | **Project 9: @aor/admin** | Second feature package |
| 10 | **Project 14: Documentation** | Docs site for public launch |
| 11 | **Project 15: Examples** | Proof that everything works together |
| 12 | **Project 7: Component Template** | Nice-to-have generator |
| 13 | **Project 10: @aor/support** | Feature package |
| 14 | **Project 11: @aor/sales** | Feature package |
| 15 | **Project 12: @aor/marketing** | Feature package |
| 16 | **Project 16: @aor/mobile** | Future |

**Total remaining tasks: ~195 file changes across 16 projects.**
