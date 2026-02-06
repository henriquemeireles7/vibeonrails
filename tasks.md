# Vibe on Rails — Remaining Tasks

> Each task = one file change. Organized by project.
> Status: `[ ]` = not started, `[x]` = done

---

## Project 1: @vibeonrails/core — Remaining Framework Gaps ✅

> What exists: API (server, trpc, context, router, middleware), Database (client, migrate, schema), Security (jwt, password, guards), Shared (errors, types, utils)
> What's missing: database seeds/repos, session auth, OAuth, crypto utils, CSRF, audit logging

### Database — Seeds Infrastructure

- [x] `packages/core/src/database/seeds/development.ts` — Development seed data (sample users, posts)
- [x] `packages/core/src/database/seeds/test.ts` — Test seed data (minimal fixtures)
- [x] `packages/core/src/database/seeds/index.ts` — Seed runner (runSeeds function)
- [x] `packages/core/src/database/seeds/seeds.test.ts` — Tests for seed runner

### Database — Repository Pattern

- [x] `packages/core/src/database/repositories/user.repository.ts` — User CRUD queries (findById, findByEmail, create, update)
- [x] `packages/core/src/database/repositories/post.repository.ts` — Post CRUD queries (findAll, findById, create, update, delete)
- [x] `packages/core/src/database/repositories/index.ts` — Repository barrel export
- [x] `packages/core/src/database/repositories/user.repository.test.ts` — User repository tests
- [x] `packages/core/src/database/repositories/post.repository.test.ts` — Post repository tests
- [x] `packages/core/src/database/index.ts` — Update to export repositories and seeds

### Security — Session Management

- [x] `packages/core/src/security/auth/sessions.ts` — Session create/validate/revoke with Redis backing
- [x] `packages/core/src/security/auth/sessions.test.ts` — Session management tests
- [x] `packages/core/src/security/auth/index.ts` — Update to export sessions

### Security — OAuth Providers

- [x] `packages/core/src/security/auth/oauth.ts` — OAuth provider config (Google, GitHub, Discord)
- [x] `packages/core/src/security/auth/oauth.test.ts` — OAuth flow tests
- [x] `packages/core/src/security/auth/index.ts` — Update to export oauth

### Security — Crypto Utilities

- [x] `packages/core/src/security/crypto/encrypt.ts` — AES-256-GCM encrypt/decrypt functions
- [x] `packages/core/src/security/crypto/hash.ts` — SHA-256 hashing utilities
- [x] `packages/core/src/security/crypto/tokens.ts` — Secure random token generation (email verify, password reset)
- [x] `packages/core/src/security/crypto/index.ts` — Crypto barrel export
- [x] `packages/core/src/security/crypto/crypto.test.ts` — Crypto utility tests
- [x] `packages/core/src/security/index.ts` — Update to export crypto module

### Security — CSRF Protection

- [x] `packages/core/src/security/middleware/csrf.ts` — CSRF token middleware for Hono
- [x] `packages/core/src/security/middleware/csrf.test.ts` — CSRF middleware tests
- [x] `packages/core/src/security/middleware/index.ts` — Security middleware barrel export
- [x] `packages/core/src/security/index.ts` — Update to export security middleware

### Security — Audit Logging

- [x] `packages/core/src/security/audit/logger.ts` — Audit log for auth events (login, logout, password change, role change)
- [x] `packages/core/src/security/audit/logger.test.ts` — Audit logger tests
- [x] `packages/core/src/security/audit/index.ts` — Audit barrel export
- [x] `packages/core/src/security/index.ts` — Update to export audit module

### Core — Package Exports Update

- [x] `packages/core/tsup.config.ts` — Add new entry points for crypto, audit if sub-path exports needed

---

## Project 2: @vibeonrails/infra — Remaining Framework Gaps ✅

> What exists: Health, Logging, Queue (jobs), Email, Cache, Storage
> What's missing: cron jobs, realtime/WebSockets, monitoring/metrics

### Queue — Cron Job Support

- [x] `packages/infra/src/queue/cron.ts` — defineCron() function with schedule parsing
- [x] `packages/infra/src/queue/cron.test.ts` — Cron definition tests
- [x] `packages/infra/src/queue/index.ts` — Update to export cron

### Realtime — WebSocket Module

- [x] `packages/infra/src/realtime/server.ts` — WebSocket server setup (Hono WebSocket adapter)
- [x] `packages/infra/src/realtime/channels.ts` — Channel subscription management (subscribe, broadcast, unsubscribe)
- [x] `packages/infra/src/realtime/index.ts` — Realtime barrel export
- [x] `packages/infra/src/realtime/realtime.test.ts` — Realtime module tests

### Monitoring — Metrics & Tracing

- [x] `packages/infra/src/monitoring/metrics.ts` — Counter, histogram, gauge metric collection
- [x] `packages/infra/src/monitoring/tracing.ts` — Request tracing with trace ID propagation
- [x] `packages/infra/src/monitoring/index.ts` — Monitoring barrel export
- [x] `packages/infra/src/monitoring/metrics.test.ts` — Metrics tests

### Infra — Package Updates

- [x] `packages/infra/tsup.config.ts` — Add realtime and monitoring entry points
- [x] `packages/infra/package.json` — Add WebSocket dependencies if needed
- [x] `packages/infra/src/index.ts` — Update to export realtime and monitoring
- [x] `packages/infra/SKILL.md` — Update to document new modules

---

## Project 3: @vibeonrails/cli — New Package (Developer Experience)

> This is what makes the framework usable. `npx create-vibe my-app` and `npx vibe generate module user`.

### Package Setup

- [x] `packages/cli/package.json` — Package config with commander, chalk, ora, handlebars deps
- [x] `packages/cli/tsconfig.json` — TypeScript config extending root
- [x] `packages/cli/tsup.config.ts` — Build config for CLI binary
- [x] `packages/cli/vitest.config.ts` — Test config

### Binary Entry Point

- [x] `packages/cli/bin/vibe.js` — CLI entry point (#!/usr/bin/env node, loads dist/index.js)
- [x] `packages/cli/bin/create-vibe.js` — create-vibe entry point

### CLI Main Router

- [x] `packages/cli/src/index.ts` — Commander program setup, registers all commands

### Commands

- [x] `packages/cli/src/commands/create.ts` — `npx create-vibe <name>` — scaffold new project from app template
- [x] `packages/cli/src/commands/generate.ts` — `npx vibe generate module|component <name>` — generate code from templates
- [x] `packages/cli/src/commands/dev.ts` — `npx vibe dev` — start dev server (API + web concurrently)
- [x] `packages/cli/src/commands/db.ts` — `npx vibe db:migrate|seed|reset` — database operations
- [x] `packages/cli/src/commands/build.ts` — `npx vibe build` — production build
- [x] `packages/cli/src/commands/deploy.ts` — `npx vibe deploy railway|fly` — deploy to cloud (placeholder)

### Generators

- [x] `packages/cli/src/generators/app.generator.ts` — Copy app template, replace placeholders, install deps
- [x] `packages/cli/src/generators/module.generator.ts` — Generate types + service + controller + test for an API module
- [x] `packages/cli/src/generators/component.generator.ts` — Generate React component from template

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

## Project 4: @vibeonrails/web — New Package (Frontend) ✅

> CSS system, React components, hooks, tRPC client. Published as `@vibeonrails/web`.

### Package Setup

- [x] `packages/web/package.json` — Package config with React 18/19, @trpc/react-query, zustand, @tanstack/react-query
- [x] `packages/web/tsconfig.json` — TypeScript config with JSX support
- [x] `packages/web/tsup.config.ts` — Build config with multiple entry points
- [x] `packages/web/vitest.config.ts` — Test config with jsdom environment

### CSS System — Design Tokens

- [x] `packages/web/src/styles/tokens.css` — CSS custom properties (colors, spacing, typography, radius, shadows, dark mode)
- [x] `packages/web/src/styles/layout.css` — Layout utilities (.stack, .row, .row-between, .row-center, gap classes)
- [x] `packages/web/src/styles/components.css` — Component classes (.btn, .btn-primary, .input, .card, .badge, etc.)
- [x] `packages/web/src/styles/motion.css` — Animation utilities (transitions, keyframes, reduced-motion)

### UI Components

- [x] `packages/web/src/components/ui/Button.tsx` — Button component (primary, secondary, ghost, danger + sizes + loading)
- [x] `packages/web/src/components/ui/Input.tsx` — Input component (text, email, password, with label + error + helpText)
- [x] `packages/web/src/components/ui/Select.tsx` — Select dropdown component
- [x] `packages/web/src/components/ui/Modal.tsx` — Modal/dialog component (native <dialog>)
- [x] `packages/web/src/components/ui/Toast.tsx` — Toast notification component (success, error, info, warning)
- [x] `packages/web/src/components/ui/index.ts` — UI components barrel export

### Form Components

- [x] `packages/web/src/components/forms/FormField.tsx` — FormField wrapper (label + input + error message)
- [x] `packages/web/src/components/forms/index.ts` — Forms barrel export

### Data Display Components

- [x] `packages/web/src/components/data/DataTable.tsx` — Data table with sorting, pagination
- [x] `packages/web/src/components/data/Card.tsx` — Card component
- [x] `packages/web/src/components/data/List.tsx` — List component with click handler
- [x] `packages/web/src/components/data/index.ts` — Data components barrel export

### Layout Components

- [x] `packages/web/src/components/layout/PageLayout.tsx` — Page layout with header + sidebar + content
- [x] `packages/web/src/components/layout/Header.tsx` — App header (logo, nav, actions)
- [x] `packages/web/src/components/layout/Sidebar.tsx` — Sidebar navigation
- [x] `packages/web/src/components/layout/index.ts` — Layout components barrel export

### Hooks

- [x] `packages/web/src/hooks/useApi.ts` — tRPC client helpers (createTRPCReact re-export, QueryClient, httpBatchLink)
- [x] `packages/web/src/hooks/useAuth.ts` — Zustand auth store (user, token, login, logout, isAuthenticated)
- [x] `packages/web/src/hooks/index.ts` — Hooks barrel export

### Routing

- [x] `packages/web/src/routing/defineRoutes.ts` — Type-safe route definitions + flattenRoutes + getProtected/PublicRoutes
- [x] `packages/web/src/routing/index.ts` — Routing barrel export

### Package Entry

- [x] `packages/web/src/index.ts` — Main barrel export for entire @vibeonrails/web package

### Tests

- [x] `packages/web/src/components/ui/Button.test.tsx` — Button component tests (7 tests)
- [x] `packages/web/src/components/ui/Input.test.tsx` — Input component tests (7 tests)
- [x] `packages/web/src/hooks/useAuth.test.ts` — Auth hook tests (6 tests)

### Docs

- [x] `packages/web/SKILL.md` — Web package skill document

---

## Project 5: App Template — What `create-vibe` Scaffolds ✅

> This is the starter project a real developer gets when they run `npx create-vibe my-app`.

### Root Config

- [x] `templates/app/package.json` — Template package.json with @vibeonrails/core, @vibeonrails/infra deps
- [x] `templates/app/tsconfig.json` — App-level TypeScript config
- [x] `templates/app/.env.example` — Environment variables template
- [x] `templates/app/.gitignore` — Git ignore for generated app
- [x] `templates/app/drizzle.config.ts` — Drizzle Kit migration config

### App Entry

- [x] `templates/app/src/main.ts` — App entry point (creates server, starts listening on port)
- [x] `templates/app/src/router.ts` — Main tRPC router (imports and merges all module routers)

### Config

- [x] `templates/app/src/config/app.ts` — App config (name, port, env)
- [x] `templates/app/src/config/database.ts` — Database config (creates db instance from @vibeonrails/core)
- [x] `templates/app/src/config/env.ts` — Env validation with Zod

### Auth Module (built-in)

- [x] `templates/app/src/modules/auth/auth.types.ts` — LoginSchema, RegisterSchema, RefreshSchema
- [x] `templates/app/src/modules/auth/auth.service.ts` — register, login, refreshToken, me logic
- [x] `templates/app/src/modules/auth/auth.controller.ts` — tRPC router: register, login, refresh, me
- [x] `templates/app/src/modules/auth/auth.test.ts` — Auth endpoint tests

### User Module (built-in)

- [x] `templates/app/src/modules/user/user.types.ts` — UpdateUserSchema, user Zod schemas
- [x] `templates/app/src/modules/user/user.service.ts` — CRUD operations
- [x] `templates/app/src/modules/user/user.controller.ts` — tRPC router: getProfile, updateProfile, list, getById
- [x] `templates/app/src/modules/user/user.test.ts` — User endpoint tests

### Post Module (example)

- [x] `templates/app/src/modules/post/post.types.ts` — CreatePostSchema, UpdatePostSchema
- [x] `templates/app/src/modules/post/post.service.ts` — CRUD operations with ownership checks
- [x] `templates/app/src/modules/post/post.controller.ts` — tRPC router: list, getById, create, update, delete
- [x] `templates/app/src/modules/post/post.test.ts` — Post endpoint tests

### Database Seeds

- [x] `templates/app/src/database/seeds/development.ts` — Dev seed: sample admin + regular user + posts
- [x] `templates/app/src/database/seeds/test.ts` — Test seed: minimal fixtures
- [x] `templates/app/src/database/seeds/index.ts` — Seed runner (picks seed by NODE_ENV)

### Frontend (web) — Blocked by @vibeonrails/web (Project 4)

- [x] `templates/app/src/web/App.tsx` — React app entry with router + providers
- [x] `templates/app/src/web/pages/HomePage.tsx` — Landing page
- [x] `templates/app/src/web/pages/LoginPage.tsx` — Login form page
- [x] `templates/app/src/web/pages/RegisterPage.tsx` — Register form page
- [x] `templates/app/src/web/pages/DashboardPage.tsx` — Authenticated dashboard
- [x] `templates/app/src/web/pages/PostsPage.tsx` — Posts list page
- [x] `templates/app/src/web/pages/PostPage.tsx` — Single post view
- [x] `templates/app/src/web/routes/index.ts` — Route definitions (defineRoutes)
- [x] `templates/app/vite.config.ts` — Vite config for frontend build
- [x] `templates/app/index.html` — HTML entry point for Vite

### SKILL.md Files

- [x] `templates/app/SKILL.md` — Root project skill
- [x] `templates/app/src/modules/SKILL.md` — Modules skill (module creation pattern)
- [x] `templates/app/src/database/SKILL.md` — Database skill (schema + migrations + seeds)
- [x] `templates/app/src/web/SKILL.md` — Web frontend skill (blocked by @vibeonrails/web)
- [x] `templates/app/src/web/components/SKILL.md` — Components skill (blocked by @vibeonrails/web)

### Planning System

- [x] `templates/app/.plan/SKILL.md` — How to use the planning system
- [x] `templates/app/.plan/PROJECT.md` — Project overview template
- [x] `templates/app/.plan/CONTEXT.md` — AI context template
- [x] `templates/app/.plan/ROADMAP.md` — Roadmap template
- [x] `templates/app/.plan/CURRENT.md` — Current sprint template
- [x] `templates/app/.plan/DECISIONS.md` — Decision log template

---

## Project 6: Module Template — What `vibe generate module` Creates ✅

- [x] `templates/module/types.ts.hbs` — Zod schemas (Create + Update)
- [x] `templates/module/service.ts.hbs` — Service with CRUD methods
- [x] `templates/module/controller.ts.hbs` — tRPC router wiring service to endpoints
- [x] `templates/module/service.test.ts.hbs` — Test file with basic CRUD tests
- [x] `templates/module/index.ts.hbs` — Barrel export
- [x] `templates/module/SKILL.md.hbs` — Module-specific SKILL.md

---

## Project 7: Component Template — What `vibe generate component` Creates ✅

- [x] `templates/component/{{Name}}.tsx.hbs` — React component template
- [x] `templates/component/{{Name}}.test.tsx.hbs` — Component test template

---

## Project 8: @vibeonrails/payments — Feature Package (Stripe) ✅

### Package Setup

- [x] `packages/features/payments/package.json` — Package config with stripe dependency
- [x] `packages/features/payments/tsconfig.json` — TypeScript config
- [x] `packages/features/payments/tsup.config.ts` — Build config

### Implementation

- [x] `packages/features/payments/src/checkout.ts` — createCheckout() for one-time payments
- [x] `packages/features/payments/src/subscription.ts` — createSubscription(), cancelSubscription(), changeplan()
- [x] `packages/features/payments/src/customer.ts` — createCustomer(), getCustomer(), customer portal URL
- [x] `packages/features/payments/src/webhook.ts` — Webhook handler with event type registry (on/handleWebhook)
- [x] `packages/features/payments/src/index.ts` — Barrel export

### Tests

- [x] `packages/features/payments/src/checkout.test.ts` — Checkout tests (mocked Stripe)
- [x] `packages/features/payments/src/webhook.test.ts` — Webhook handler tests

### Docs

- [x] `packages/features/payments/SKILL.md` — Payments skill document

---

## Project 9: @vibeonrails/admin — Feature Package (Admin Panel) ✅

### Package Setup

- [x] `packages/features/admin/package.json` — Package config (depends on @vibeonrails/web)
- [x] `packages/features/admin/tsconfig.json` — TypeScript config
- [x] `packages/features/admin/tsup.config.ts` — Build config

### Components

- [x] `packages/features/admin/src/components/AdminLayout.tsx` — Admin panel layout (sidebar + content)
- [x] `packages/features/admin/src/components/ResourceList.tsx` — Auto-generated list view with search/filter/pagination
- [x] `packages/features/admin/src/components/ResourceForm.tsx` — Auto-generated create/edit form from schema
- [x] `packages/features/admin/src/components/ResourceDetail.tsx` — Auto-generated detail view
- [x] `packages/features/admin/src/components/Dashboard.tsx` — Admin dashboard with stats

### Core

- [x] `packages/features/admin/src/config.ts` — Admin config (defineAdmin, resource registration)
- [x] `packages/features/admin/src/routes.ts` — Admin route generation (/admin/:resource, /admin/:resource/new, etc.)
- [x] `packages/features/admin/src/hooks/useResource.ts` — Hook for fetching/mutating admin resources
- [x] `packages/features/admin/src/index.ts` — Barrel export

### Tests

- [x] `packages/features/admin/src/components/ResourceList.test.tsx` — ResourceList tests

### Docs

- [x] `packages/features/admin/SKILL.md` — Admin skill document

---

## Project 10: @vibeonrails/support — Feature Package (Helpdesk) ✅

### Package Setup

- [x] `packages/features/support/package.json` — Package config
- [x] `packages/features/support/tsconfig.json` — TypeScript config
- [x] `packages/features/support/tsup.config.ts` — Build config

### Implementation

- [x] `packages/features/support/src/knowledge-base/loader.ts` — Load Markdown knowledge base articles
- [x] `packages/features/support/src/tickets/ticket.service.ts` — Ticket CRUD (create, assign, resolve, close)
- [x] `packages/features/support/src/tickets/ticket.types.ts` — Ticket schemas
- [x] `packages/features/support/src/chat/ChatWidget.tsx` — Embeddable chat widget component
- [x] `packages/features/support/src/chat/chat.service.ts` — Chat message handling + AI routing
- [x] `packages/features/support/src/index.ts` — Barrel export

### Docs

- [x] `packages/features/support/SKILL.md` — Support skill document

---

## Project 11: @vibeonrails/sales — Feature Package (AI Sales Agent) ✅

### Package Setup

- [x] `packages/features/sales/package.json` — Package config
- [x] `packages/features/sales/tsconfig.json` — TypeScript config
- [x] `packages/features/sales/tsup.config.ts` — Build config

### Implementation

- [x] `packages/features/sales/src/config.ts` — Sales agent config (name, tone, channels, qualification questions)
- [x] `packages/features/sales/src/agent.ts` — AI sales agent logic (FAQ, qualify, book demo, handoff)
- [x] `packages/features/sales/src/channels/webchat.ts` — Webchat channel integration
- [x] `packages/features/sales/src/channels/whatsapp.ts` — WhatsApp channel integration
- [x] `packages/features/sales/src/channels/telegram.ts` — Telegram channel integration
- [x] `packages/features/sales/src/index.ts` — Barrel export

### Docs

- [x] `packages/features/sales/SKILL.md` — Sales skill document

---

## Project 12: @vibeonrails/marketing — Feature Package (Marketing Automation) ✅

### Package Setup

- [x] `packages/features/marketing/package.json` — Package config
- [x] `packages/features/marketing/tsconfig.json` — TypeScript config
- [x] `packages/features/marketing/tsup.config.ts` — Build config

### Implementation

- [x] `packages/features/marketing/src/content/generate.ts` — AI content generation (social posts, emails)
- [x] `packages/features/marketing/src/social/schedule.ts` — Multi-platform social media scheduling
- [x] `packages/features/marketing/src/social/platforms.ts` — Platform adapters (Twitter, LinkedIn)
- [x] `packages/features/marketing/src/sequences/define.ts` — defineSequence() for email drip campaigns
- [x] `packages/features/marketing/src/sequences/runner.ts` — Sequence execution engine
- [x] `packages/features/marketing/src/index.ts` — Barrel export

### Docs

- [x] `packages/features/marketing/SKILL.md` — Marketing skill document

---

## Project 13: Content System — Email & Website Templates ✅

> These go inside the app template. Content is separate from code.

### Email Templates

- [x] `templates/app/content/locales/en/emails/welcome.md` — Welcome email template
- [x] `templates/app/content/locales/en/emails/password-reset.md` — Password reset email template
- [x] `templates/app/content/locales/en/emails/email-verify.md` — Email verification template
- [x] `templates/app/content/locales/en/emails/invoice.md` — Invoice email template

### Website Content

- [x] `templates/app/content/locales/en/website/landing.md` — Landing page copy
- [x] `templates/app/content/locales/en/website/pricing.md` — Pricing page copy
- [x] `templates/app/content/locales/en/website/about.md` — About page copy

### App Content

- [x] `templates/app/content/locales/en/app/onboarding.md` — Onboarding flow copy
- [x] `templates/app/content/locales/en/app/errors.md` — User-facing error messages

### Brand

- [x] `templates/app/content/brand/voice.md` — Brand voice guidelines
- [x] `templates/app/content/brand/terminology.md` — Product terminology glossary

### Content SKILL

- [x] `templates/app/content/SKILL.md` — How to work with the content system

---

## Project 14: Documentation Site ✅

### Setup

- [x] `docs/package.json` — Docs site package (Astro or similar SSG)
- [x] `docs/astro.config.ts` — SSG configuration

### Pages

- [x] `docs/src/pages/index.md` — Documentation home page
- [x] `docs/src/pages/getting-started.md` — Quick start guide (create project, add module, run dev)
- [x] `docs/src/pages/core/api.md` — @vibeonrails/core API reference
- [x] `docs/src/pages/core/database.md` — Database module reference
- [x] `docs/src/pages/core/security.md` — Security module reference
- [x] `docs/src/pages/infra/overview.md` — @vibeonrails/infra overview
- [x] `docs/src/pages/web/css-system.md` — CSS system documentation
- [x] `docs/src/pages/web/components.md` — Component library reference
- [x] `docs/src/pages/cli/commands.md` — CLI commands reference
- [x] `docs/src/pages/features/payments.md` — Payments feature docs
- [x] `docs/src/pages/features/admin.md` — Admin feature docs
- [x] `docs/src/pages/tutorials/first-module.md` — Tutorial: Create your first module
- [x] `docs/src/pages/tutorials/authentication.md` — Tutorial: Add authentication
- [x] `docs/src/pages/tutorials/deploy.md` — Tutorial: Deploy to production

---

## Project 15: Example Applications ✅

### Basic Example

- [x] `examples/basic/package.json` — Minimal VoR app (auth + posts)
- [x] `examples/basic/src/main.ts` — App entry
- [x] `examples/basic/src/router.ts` — Router with auth + post modules
- [x] `examples/basic/README.md` — How to run the example

### Full SaaS Example

- [x] `examples/saas/package.json` — Full SaaS app (auth, users, posts, payments, admin)
- [x] `examples/saas/src/main.ts` — App entry
- [x] `examples/saas/src/router.ts` — Router with all modules
- [x] `examples/saas/README.md` — How to run the example

---

## Project 16: @vibeonrails/mobile — Future Package (React Native) (deferred)

> Lower priority. Listed for completeness from vision doc.

- [x] `packages/mobile/package.json` — Package config with React Native deps
- [x] `packages/mobile/tsconfig.json` — TypeScript config
- [x] `packages/mobile/src/components/index.ts` — Mobile component exports
- [x] `packages/mobile/src/screens/index.ts` — Screen component exports
- [x] `packages/mobile/src/navigation/index.ts` — Navigation setup
- [x] `packages/mobile/src/index.ts` — Barrel export
- [x] `packages/mobile/SKILL.md` — Mobile skill document

---

## Project 17: @vibeonrails/docs — Documentation Package + Content

> What exists: Astro Starlight docs site with 179 page stubs, DOCS_STRATEGY.md, Getting Started content
> What's needed: A `@vibeonrails/docs` package for end users + fill in all documentation content

### Phase 1: @vibeonrails/docs Package (Framework Feature)

> A package that wraps Astro Starlight with VibeonRails conventions.
> Users run `vibe docs init` to scaffold a docs site, `vibe docs dev` to run it.
> We dogfood this by using it for our own documentation.

#### Package Setup

- [ ] `packages/docs/package.json` — Package config (depends on astro, @astrojs/starlight)
- [ ] `packages/docs/tsconfig.json` — TypeScript config
- [ ] `packages/docs/tsup.config.ts` — Build config
- [ ] `packages/docs/SKILL.md` — Package skill document
- [ ] `packages/docs/vitest.config.ts` — Test config

#### Starlight Presets (Convention over Configuration)

- [ ] `packages/docs/src/presets/starlight.ts` — Default Starlight config factory (createDocsConfig)
- [ ] `packages/docs/src/presets/sidebar.ts` — Auto-generate sidebar from file structure conventions
- [ ] `packages/docs/src/presets/theme.ts` — VibeonRails default theme (colors, fonts, CSS)
- [ ] `packages/docs/src/presets/index.ts` — Presets barrel export
- [ ] `packages/docs/src/presets/presets.test.ts` — Preset tests

#### Custom Components (MDX Components for Docs)

- [ ] `packages/docs/src/components/ApiReference.tsx` — Renders function signature + params table from JSDoc
- [ ] `packages/docs/src/components/CodeExample.tsx` — Tabbed code examples (TypeScript/JavaScript)
- [ ] `packages/docs/src/components/PackageInstall.tsx` — Install command for pnpm/npm/yarn
- [ ] `packages/docs/src/components/PropTable.tsx` — Component props table from TypeScript types
- [ ] `packages/docs/src/components/StatusBadge.tsx` — Feature status badge (stable/beta/experimental)
- [ ] `packages/docs/src/components/index.ts` — Components barrel export
- [ ] `packages/docs/src/components/components.test.tsx` — Component tests

#### Remark/Rehype Plugins

- [ ] `packages/docs/src/plugins/skill-loader.ts` — Remark plugin: include SKILL.md content in docs
- [ ] `packages/docs/src/plugins/api-gen.ts` — Remark plugin: auto-generate API reference from TypeScript exports
- [ ] `packages/docs/src/plugins/index.ts` — Plugins barrel export
- [ ] `packages/docs/src/plugins/plugins.test.ts` — Plugin tests

#### Docs Site Template (for `vibe docs init`)

- [ ] `packages/docs/templates/docs-site/package.json.hbs` — Template package.json
- [ ] `packages/docs/templates/docs-site/astro.config.mjs.hbs` — Template Astro config
- [ ] `packages/docs/templates/docs-site/tsconfig.json` — Template TS config
- [ ] `packages/docs/templates/docs-site/src/content.config.ts.hbs` — Template content config
- [ ] `packages/docs/templates/docs-site/src/content/docs/index.mdx.hbs` — Template homepage
- [ ] `packages/docs/templates/docs-site/src/content/docs/getting-started.mdx.hbs` — Template getting started

#### CLI Integration

- [ ] `packages/cli/src/commands/docs.ts` — `vibe docs init|dev|build` commands
- [ ] `packages/cli/src/generators/docs.generator.ts` — Scaffold docs site from template
- [ ] `packages/cli/src/generators/docs.generator.test.ts` — Docs generator tests
- [ ] `packages/cli/src/index.ts` — Register docs command

#### Package Entry & Exports

- [ ] `packages/docs/src/index.ts` — Main barrel export (createDocsConfig, components, plugins)

### Phase 2: Dogfooding (Migrate Our Docs to Use @vibeonrails/docs)

> Replace the manual Astro config in docs/ with our own package.

- [ ] `docs/package.json` — Add @vibeonrails/docs dependency
- [ ] `docs/astro.config.mjs` — Use createDocsConfig() from @vibeonrails/docs
- [ ] `docs/src/content.config.ts` — Update to use our package's schema if needed

### Phase 3: Fill Documentation Content (P0 — Core User Journey)

> These are the most important pages. Written from source code + SKILL.md files.

#### Getting Started (already partially done)

- [x] `docs/src/content/docs/getting-started/introduction.mdx` — Full content
- [x] `docs/src/content/docs/getting-started/installation.mdx` — Full content
- [x] `docs/src/content/docs/getting-started/quick-start.mdx` — Full content
- [x] `docs/src/content/docs/getting-started/project-structure.mdx` — Full content
- [x] `docs/src/content/docs/getting-started/philosophy.mdx` — Full content

#### Guides — Database (P0)

- [ ] `docs/src/content/docs/guides/database/index.mdx` — Database overview
- [ ] `docs/src/content/docs/guides/database/client.mdx` — Client & connections
- [ ] `docs/src/content/docs/guides/database/schema.mdx` — Schema definitions
- [ ] `docs/src/content/docs/guides/database/migrations.mdx` — Migrations
- [ ] `docs/src/content/docs/guides/database/repositories.mdx` — Repository pattern
- [ ] `docs/src/content/docs/guides/database/seeds.mdx` — Seeds
- [ ] `docs/src/content/docs/guides/database/relations.mdx` — Relations
- [ ] `docs/src/content/docs/guides/database/queries.mdx` — Query patterns
- [ ] `docs/src/content/docs/guides/database/transactions.mdx` — Transactions

#### Guides — API (P0)

- [ ] `docs/src/content/docs/guides/api/index.mdx` — API overview
- [ ] `docs/src/content/docs/guides/api/server.mdx` — Hono server
- [ ] `docs/src/content/docs/guides/api/trpc.mdx` — tRPC integration
- [ ] `docs/src/content/docs/guides/api/procedures.mdx` — Procedures
- [ ] `docs/src/content/docs/guides/api/context.mdx` — Request context
- [ ] `docs/src/content/docs/guides/api/middleware.mdx` — Middleware
- [ ] `docs/src/content/docs/guides/api/error-handling.mdx` — Error handling
- [ ] `docs/src/content/docs/guides/api/rate-limiting.mdx` — Rate limiting

#### Guides — Security (P0)

- [ ] `docs/src/content/docs/guides/security/index.mdx` — Security overview
- [ ] `docs/src/content/docs/guides/security/authentication.mdx` — Authentication
- [ ] `docs/src/content/docs/guides/security/jwt.mdx` — JWT tokens

#### Tutorials (P0)

- [ ] `docs/src/content/docs/tutorials/your-first-app.mdx` — Build a todo app
- [ ] `docs/src/content/docs/tutorials/authentication.mdx` — Add authentication

#### Reference (P0)

- [ ] `docs/src/content/docs/reference/api/create-server.mdx` — createServer() reference
- [ ] `docs/src/content/docs/reference/database/create-database.mdx` — createDatabase() reference
- [ ] `docs/src/content/docs/reference/security/jwt-api.mdx` — JWT functions reference

### Phase 4: Fill Documentation Content (P1 — Essential)

> All remaining guides, how-to recipes, and feature docs.
> ~100 pages to be written from source code.

- [ ] All remaining Guide pages (security, web, infra, CLI)
- [ ] All How-To recipe pages
- [ ] Feature docs (payments, admin, support, sales, marketing)
- [ ] All Reference pages
- [ ] Advanced, Contributing, FAQ, Glossary, Troubleshooting, Changelog

---

## Summary — Build Order (Recommended)

| Priority | Project | Why |
|----------|---------|-----|
| 1 | **Project 3: @vibeonrails/cli** | Without the CLI, nobody can use the framework |
| 2 | **Project 5: App Template** | What the CLI scaffolds — makes the framework real |
| 3 | **Project 6: Module Template** | What `vibe generate module` produces |
| 4 | **Project 4: @vibeonrails/web** | Frontend components + CSS system |
| 5 | **Project 1: @vibeonrails/core gaps** | Repos, seeds, sessions, OAuth, crypto |
| 6 | **Project 2: @vibeonrails/infra gaps** | Cron, realtime, monitoring |
| 7 | **Project 13: Content System** | Email/website templates for the app template |
| 8 | **Project 8: @vibeonrails/payments** | First feature package |
| 9 | **Project 9: @vibeonrails/admin** | Second feature package |
| 10 | **Project 14: Documentation** | Docs site for public launch |
| 11 | **Project 15: Examples** | Proof that everything works together |
| 12 | **Project 7: Component Template** | Nice-to-have generator |
| 13 | **Project 10: @vibeonrails/support** | Feature package |
| 14 | **Project 11: @vibeonrails/sales** | Feature package |
| 15 | **Project 12: @vibeonrails/marketing** | Feature package |
| 16 | **Project 16: @vibeonrails/mobile** | Future |
| **17** | **Project 17: @vibeonrails/docs** | **Docs package + content (ACTIVE)** |

**Total remaining tasks: ~50 file changes for Project 17 (all prior projects complete).**
