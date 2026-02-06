# Vibe on Rails Documentation

Welcome to the official documentation for **Vibe on Rails** — a full-stack TypeScript framework designed for AI-assisted development. Predictable conventions, zero ambiguity, maximum productivity.

---

## What is Vibe on Rails?

Vibe on Rails is an opinionated, convention-driven framework that gives you everything you need to build production-ready TypeScript applications. It combines the best tools in the ecosystem — Hono, tRPC, Drizzle ORM, Zod, BullMQ, and more — into a cohesive, type-safe experience.

**Core principles:**

- **Convention over Configuration** — sensible defaults, override when you need to
- **End-to-End Type Safety** — from database schema to API client, everything is typed
- **AI-Agent Friendly** — clear patterns and SKILL.md files make the codebase predictable for both humans and AI
- **Modular Architecture** — use only what you need, everything is tree-shakeable

---

## Quick Navigation

### Getting Started

- [Quick Start Guide](./getting-started) — Create your first Vibe on Rails project in minutes

### Core Package (`@vibeonrails/core`)

- [API — Server & tRPC](./core/api) — HTTP server, tRPC routers, middleware, rate limiting
- [Database — Drizzle ORM](./core/database) — Schema definition, migrations, seeds, repositories
- [Security — Auth & Crypto](./core/security) — JWT, passwords, sessions, OAuth, CSRF, audit logging

### Infrastructure Package (`@vibeonrails/infra`)

- [Infrastructure Overview](./infra/overview) — Health checks, logging, queues, email, cache, storage, realtime, monitoring

### Web Package (`@vibeonrails/web`)

- [CSS System](./web/css-system) — Design tokens, layout utilities, component classes, animations, dark mode
- [Component Library](./web/components) — Button, Input, Select, Modal, Toast, DataTable, PageLayout, and more

### CLI (`@vibeonrails/cli`)

- [CLI Commands](./cli/commands) — Project scaffolding, code generation, dev server, database tools, deployment

### Features

- [Payments](./features/payments) — Stripe integration, subscriptions, webhooks
- [Admin Panel](./features/admin) — Auto-generated CRUD views with `defineAdmin`

### Tutorials

- [Create Your First Module](./tutorials/first-module) — Step-by-step guide to building a module
- [Add Authentication](./tutorials/authentication) — JWT, sessions, and OAuth setup
- [Deploy to Production](./tutorials/deploy) — Railway, Fly.io, and Docker deployment

---

## Architecture Overview

Vibe on Rails is organized as a monorepo with focused packages:

```
your-app/
├── src/
│   ├── config/          # App configuration (env, database)
│   ├── modules/         # Feature modules (auth, user, post, etc.)
│   │   └── user/
│   │       ├── user.types.ts
│   │       ├── user.service.ts
│   │       ├── user.controller.ts
│   │       ├── user.test.ts
│   │       └── index.ts
│   ├── router.ts        # Merge all module routers
│   └── main.ts          # App entry point
├── drizzle/             # Database migrations
├── package.json
└── tsconfig.json
```

The framework packages:

| Package | Purpose |
|---------|---------|
| `@vibeonrails/core` | API server (Hono + tRPC), Database (Drizzle), Security (JWT + Argon2) |
| `@vibeonrails/infra` | Health, Logging, Queue, Email, Cache, Storage, Realtime, Monitoring |
| `@vibeonrails/web` | CSS system, React components, hooks, routing |
| `@vibeonrails/cli` | Scaffolding, code generation, dev tools |

---

## Installation

```bash
# Create a new project
npx create-vibe my-app

# Or add to an existing project
pnpm add @vibeonrails/core @vibeonrails/infra
```

---

## Community & Support

- **GitHub**: [github.com/vibeonrails/vibeonrails](https://github.com/vibeonrails/vibeonrails)
- **Discord**: Join the community for help and discussions
- **Issues**: Report bugs and request features on GitHub

---

*Built with TypeScript. Designed for developers. Loved by AI agents.*
