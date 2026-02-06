# VibeonRails Documentation Strategy

> How world-class frameworks document themselves, and how we should too.

## Table of Contents

1. [The Problem](#the-problem)
2. [The Diataxis Framework](#the-diataxis-framework)
3. [What Great Frameworks Do](#what-great-frameworks-do)
4. [Our Documentation Architecture](#our-documentation-architecture)
5. [Complete File Structure](#complete-file-structure)
6. [Page Templates](#page-templates)
7. [Writing Standards](#writing-standards)
8. [Tooling (Astro Starlight)](#tooling)
9. [The Docs Module for Users](#the-docs-module-for-users)
10. [Dogfooding: Using Our Own Module](#dogfooding)

---

## The Problem

Our current documentation has **14 pages** covering the entire framework. By comparison:

| Framework | Doc Pages | Approach |
|-----------|-----------|----------|
| **Django** | 500+ | Diataxis (tutorials, topics, how-to, reference) |
| **Rails** | 200+ | Guides + API Reference |
| **NestJS** | 150+ | Progressive disclosure (overview -> techniques -> recipes) |
| **Next.js** | 100+ | Getting started -> Building -> API Reference |
| **Laravel** | 120+ | Narrative guides + API Reference |
| **VibeonRails** | **14** | One page per area |

The issue is not just quantity, it is **taxonomy** (how we organize knowledge) and **granularity** (how deep we go).

---

## The Diataxis Framework

The gold standard for technical documentation is the [Diataxis framework](https://diataxis.fr/), created by Daniele Procida. It is used by Django, NumPy, Cloudflare Workers, Gatsby, and many other world-class projects.

Diataxis divides documentation into **4 quadrants** based on two axes:

```
                    PRACTICAL                    THEORETICAL
                 (doing things)              (understanding things)
              +-------------------+       +-------------------+
  LEARNING    |    TUTORIALS      |       |     GUIDES        |
  (study)     |                   |       |   (Explanation)    |
              | "Learning-        |       | "Understanding-    |
              |  oriented"        |       |  oriented"         |
              |                   |       |                    |
              | Teaches through   |       | Explains concepts, |
              | doing. Step by    |       | architecture, why  |
              | step. Handholding.|       | things work.       |
              +-------------------+       +-------------------+
              +-------------------+       +-------------------+
  WORKING     |    HOW-TO         |       |   REFERENCE        |
  (apply)     |   (Recipes)       |       |                    |
              | "Task-            |       | "Information-      |
              |  oriented"        |       |  oriented"         |
              |                   |       |                    |
              | Solves specific   |       | Dry, accurate,     |
              | problems. Assumes |       | complete. Function |
              | competence.       |       | signatures, params.|
              +-------------------+       +-------------------+
```

### Why This Matters

Each quadrant serves a different user need:

- **Tutorials**: "I am new, teach me" (beginner, learning)
- **Guides**: "I want to understand how this works" (intermediate, studying)
- **How-to**: "I need to do X right now" (experienced, building)
- **Reference**: "What are the exact parameters?" (any level, looking up)

A user who needs a tutorial will be frustrated by a reference page. A user who needs a reference will be frustrated by a tutorial. **Mixing these is why most docs feel bad.**

---

## What Great Frameworks Do

### Django (The Documentation King)

Django has the best documentation in the industry. Here is what they do:

1. **Tutorial** (7 parts): Build a polls app from scratch
2. **Topic guides** (30+): Deep dives into models, forms, views, templates, auth, caching, etc.
3. **How-to guides** (40+): "How to deploy", "How to write custom middleware", etc.
4. **Reference** (complete API): Every class, function, setting documented
5. **FAQ, Glossary, Release Notes, Contributing**

Key insight: Django documents **every sub-feature independently**. The database section alone has:
- Models, Fields, Querysets, Managers, Raw SQL, Transactions, Multiple databases, Tablespaces, Lookups, Search, Validators, Migrations (5 sub-pages), Fixtures

### Rails Guides

Rails uses a narrative guide approach:
- Each guide is a **self-contained article** (3000-8000 words)
- Active Record alone has: Basics, Migrations, Validations, Callbacks, Associations, Query Interface
- Every guide has: Overview, Detailed Explanation, Examples, Edge Cases, Caveats

### NestJS

NestJS uses progressive disclosure:
1. **Overview** (10 pages): Core concepts (controllers, providers, modules, etc.)
2. **Fundamentals** (10 pages): Advanced core concepts
3. **Techniques** (20 pages): Database, validation, caching, queues, etc.
4. **Security** (7 pages): Auth, authorization, CSRF, rate limiting
5. **Recipes** (15 pages): Integration guides (Prisma, TypeORM, Passport, etc.)

### Next.js

Next.js organizes by user journey:
1. **Getting Started**: Installation, project structure
2. **Building Your Application**: Routing, data fetching, rendering, styling, etc.
3. **API Reference**: Every component, function, config option
4. **Architecture**: Internal design decisions

### Common Patterns Across ALL Great Docs

| Pattern | Description |
|---------|-------------|
| **Quick start under 5 minutes** | First page gets you running immediately |
| **Progressive depth** | Overview -> Detailed guide -> Full reference |
| **Every sub-feature has its own page** | Not "Database" but "Schema", "Migrations", "Repositories", "Seeds" |
| **Code examples everywhere** | Every concept has runnable code |
| **Copy-pasteable snippets** | Code that works when pasted |
| **Cross-references** | "See also: [Related Topic]" throughout |
| **Version-aware** | Docs match the installed version |
| **Search** | Full-text search across all docs |
| **Edit on GitHub** | Community can fix/improve docs |
| **API from source** | Reference docs generated from TypeScript types |
| **Both theory AND practice** | Explain WHY then show HOW |
| **Troubleshooting** | Common errors with solutions |
| **Migration guides** | How to upgrade between versions |

---

## Our Documentation Architecture

Based on the analysis above, here is our documentation architecture:

### Top-Level Sections

```
docs/
  1. Getting Started     -- Onboarding (5 pages)
  2. Tutorials           -- Learning by doing (10 pages)
  3. Guides              -- Understanding concepts (50+ pages)
  4. How-To              -- Task-oriented recipes (35+ pages)
  5. Features            -- Feature package docs (20+ pages)
  6. Reference           -- API reference (30+ pages)
  7. Advanced            -- Deep dives (7 pages)
  8. Contributing        -- For contributors (5 pages)
  9. Meta pages          -- Changelog, FAQ, glossary, troubleshooting
```

### Navigation Hierarchy

```
Getting Started
  |-- Introduction (what, why, who)
  |-- Installation (manual + create-vibe)
  |-- Quick Start (5-minute app)
  |-- Project Structure (what each folder does)
  |-- Philosophy (convention over configuration)

Tutorials (step-by-step, hand-holding)
  |-- Your First App (todo app from scratch)
  |-- Adding Authentication
  |-- Database CRUD Operations
  |-- Building API Endpoints
  |-- Creating Frontend Pages
  |-- Writing Tests
  |-- Deploying to Production
  |-- Building a Full SaaS App
  |-- Building with AI Agents

Guides (conceptual understanding)
  |-- Architecture Overview
  |-- API
  |   |-- Overview
  |   |-- Hono Server
  |   |-- tRPC Integration
  |   |-- Procedures (public vs protected)
  |   |-- Request Context
  |   |-- Middleware
  |   |-- Error Handling
  |   |-- Rate Limiting
  |-- Database
  |   |-- Overview
  |   |-- Client & Connections
  |   |-- Schema Definitions
  |   |-- Migrations
  |   |-- Repository Pattern
  |   |-- Seeds
  |   |-- Relations
  |   |-- Query Patterns
  |   |-- Transactions
  |-- Security
  |   |-- Overview
  |   |-- Authentication Concepts
  |   |-- Authorization & Guards
  |   |-- Password Hashing
  |   |-- JWT Tokens
  |   |-- Sessions
  |   |-- OAuth
  |   |-- CSRF Protection
  |   |-- Encryption & Hashing
  |   |-- Audit Logging
  |-- Frontend
  |   |-- Overview
  |   |-- Component System
  |   |-- CSS Design System
  |   |-- React Hooks
  |   |-- Routing
  |   |-- tRPC Client
  |-- Infrastructure
  |   |-- Overview
  |   |-- Health Checks
  |   |-- Logging
  |   |-- Background Jobs (BullMQ)
  |   |-- Scheduled Tasks (Cron)
  |   |-- Email (Resend)
  |   |-- Caching
  |   |-- File Storage
  |   |-- Real-time (WebSocket)
  |   |-- Monitoring & Metrics
  |-- CLI
      |-- Overview
      |-- Project Scaffolding
      |-- Code Generators
      |-- Dev Server
      |-- Database Commands
      |-- Build & Deploy

How-To Recipes (task-oriented, assumes knowledge)
  |-- API Recipes
  |   |-- Create an API Endpoint
  |   |-- Add Input Validation
  |   |-- Write Custom Middleware
  |   |-- Handle File Uploads
  |   |-- Implement Pagination
  |   |-- Add API Versioning
  |-- Database Recipes
  |   |-- Define a New Table
  |   |-- Write & Run a Migration
  |   |-- Create a Repository
  |   |-- Seed Development Data
  |   |-- Write Complex Queries
  |   |-- Add Table Relations
  |   |-- Use Transactions
  |-- Security Recipes
  |   |-- Set Up Authentication
  |   |-- Protect API Routes
  |   |-- Add Role-Based Access
  |   |-- Configure OAuth Provider
  |   |-- Enable CSRF Protection
  |   |-- Hash Sensitive Data
  |-- Frontend Recipes
  |   |-- Create a New Page
  |   |-- Build a Form with Validation
  |   |-- Add Toast Notifications
  |   |-- Customize the Theme
  |   |-- Display Data Tables
  |   |-- Add Loading States
  |-- Infrastructure Recipes
  |   |-- Set Up Background Jobs
  |   |-- Send Transactional Emails
  |   |-- Add Query Caching
  |   |-- Upload Files to Storage
  |   |-- Add Real-time Features
  |   |-- Set Up Health Checks
  |-- Testing Recipes
  |   |-- Write Unit Tests
  |   |-- Write Integration Tests
  |   |-- Test API Endpoints
  |   |-- Test Database Queries
  |   |-- Test with Mocks
  |-- Deployment Recipes
      |-- Deploy with Docker
      |-- Deploy to Railway
      |-- Deploy to Fly.io
      |-- Deploy to Vercel
      |-- Production Checklist
      |-- Environment Variables

Features (feature packages)
  |-- Payments (Stripe)
  |   |-- Overview & Setup
  |   |-- Checkout Sessions
  |   |-- Subscriptions
  |   |-- Customer Management
  |   |-- Webhooks
  |   |-- Testing Payments
  |-- Admin Panel
  |   |-- Overview & Setup
  |   |-- CRUD Views
  |   |-- Customization
  |   |-- Access Control
  |-- Support
  |   |-- Overview & Setup
  |   |-- Ticket System
  |   |-- Knowledge Base
  |   |-- Live Chat
  |-- Sales
  |   |-- Overview & Setup
  |   |-- Communication Channels
  |   |-- AI Agent Config
  |-- Marketing
      |-- Overview & Setup
      |-- Content Generation
      |-- Social Scheduling
      |-- Email Sequences

Reference (dry, complete API docs)
  |-- API Reference
  |   |-- createServer()
  |   |-- createRouter()
  |   |-- Procedures
  |   |-- Context
  |   |-- Middleware
  |-- Database Reference
  |   |-- createDatabase()
  |   |-- Schema Column Types
  |   |-- Migrations API
  |   |-- Repository Methods
  |   |-- Seeds API
  |-- Security Reference
  |   |-- JWT Functions
  |   |-- Password Functions
  |   |-- Session API
  |   |-- OAuth API
  |   |-- Guards API
  |   |-- Crypto API
  |-- Frontend Reference
  |   |-- Components (Props)
  |   |-- Hooks API
  |   |-- CSS Tokens
  |   |-- tRPC Client
  |-- Infrastructure Reference
  |   |-- Health API
  |   |-- Logger API
  |   |-- Queue API
  |   |-- Email API
  |   |-- Cache API
  |   |-- Storage API
  |   |-- Realtime API
  |   |-- Monitoring API
  |-- CLI Reference
  |   |-- All Commands
  |   |-- Configuration
  |-- Feature Reference
  |   |-- Payments API
  |   |-- Admin API
  |   |-- Support API
  |   |-- Sales API
  |   |-- Marketing API
  |-- Error Codes
  |-- Configuration Options

Advanced
  |-- Architecture Deep Dive
  |-- Writing Plugins
  |-- Custom CLI Generators
  |-- Monorepo Setup
  |-- Performance Optimization
  |-- Scaling Strategies
  |-- Building with AI Agents

Contributing
  |-- How to Contribute
  |-- Development Setup
  |-- Coding Standards
  |-- Testing Guide
  |-- Writing Documentation

Changelog
FAQ
Troubleshooting
Glossary
```

**Total: ~135 pages** (comparable to NestJS, growing toward Django-level)

---

## Complete File Structure

```
docs/
  src/
    content/
      docs/
        index.mdx
        getting-started/
          introduction.mdx
          installation.mdx
          quick-start.mdx
          project-structure.mdx
          philosophy.mdx
        tutorials/
          index.mdx
          your-first-app.mdx
          authentication.mdx
          database-crud.mdx
          api-endpoints.mdx
          frontend-pages.mdx
          testing.mdx
          deployment.mdx
          full-saas.mdx
          ai-agents.mdx
        guides/
          architecture.mdx
          api/
            index.mdx
            server.mdx
            trpc.mdx
            procedures.mdx
            context.mdx
            middleware.mdx
            error-handling.mdx
            rate-limiting.mdx
          database/
            index.mdx
            client.mdx
            schema.mdx
            migrations.mdx
            repositories.mdx
            seeds.mdx
            relations.mdx
            queries.mdx
            transactions.mdx
          security/
            index.mdx
            authentication.mdx
            authorization.mdx
            passwords.mdx
            jwt.mdx
            sessions.mdx
            oauth.mdx
            csrf.mdx
            crypto.mdx
            audit.mdx
          web/
            index.mdx
            components.mdx
            css-system.mdx
            hooks.mdx
            routing.mdx
            trpc-client.mdx
          infra/
            index.mdx
            health.mdx
            logging.mdx
            queue.mdx
            cron.mdx
            email.mdx
            cache.mdx
            storage.mdx
            realtime.mdx
            monitoring.mdx
          cli/
            index.mdx
            create-project.mdx
            generators.mdx
            dev-server.mdx
            database-commands.mdx
            build-deploy.mdx
        how-to/
          index.mdx
          api/
            create-endpoint.mdx
            add-validation.mdx
            custom-middleware.mdx
            file-uploads.mdx
            pagination.mdx
          database/
            create-table.mdx
            write-migration.mdx
            create-repository.mdx
            seed-data.mdx
            complex-queries.mdx
            add-relations.mdx
          security/
            setup-auth.mdx
            protect-routes.mdx
            add-roles.mdx
            setup-oauth.mdx
            enable-csrf.mdx
          web/
            create-page.mdx
            build-form.mdx
            add-toast.mdx
            custom-theme.mdx
            data-tables.mdx
          infra/
            setup-queue.mdx
            send-email.mdx
            add-caching.mdx
            upload-files.mdx
            add-websockets.mdx
          testing/
            unit-tests.mdx
            integration-tests.mdx
            test-api.mdx
            test-database.mdx
          deployment/
            docker.mdx
            railway.mdx
            fly-io.mdx
            vercel.mdx
            production-checklist.mdx
        features/
          payments/
            index.mdx
            setup.mdx
            checkout.mdx
            subscriptions.mdx
            customers.mdx
            webhooks.mdx
            testing.mdx
          admin/
            index.mdx
            setup.mdx
            crud-views.mdx
            customization.mdx
            access-control.mdx
          support/
            index.mdx
            tickets.mdx
            knowledge-base.mdx
            chat.mdx
          sales/
            index.mdx
            channels.mdx
            ai-agent.mdx
          marketing/
            index.mdx
            content.mdx
            social.mdx
            email-sequences.mdx
        reference/
          index.mdx
          api/
            create-server.mdx
            create-router.mdx
            procedures.mdx
            context.mdx
            middleware.mdx
          database/
            create-database.mdx
            schema-types.mdx
            migrations-api.mdx
            repository-api.mdx
            seeds-api.mdx
          security/
            jwt-api.mdx
            password-api.mdx
            session-api.mdx
            oauth-api.mdx
            guards-api.mdx
            crypto-api.mdx
          web/
            components.mdx
            hooks.mdx
            css-tokens.mdx
            trpc-client.mdx
          infra/
            health-api.mdx
            logger-api.mdx
            queue-api.mdx
            email-api.mdx
            cache-api.mdx
            storage-api.mdx
            realtime-api.mdx
            monitoring-api.mdx
          cli/
            commands.mdx
            configuration.mdx
          features/
            payments-api.mdx
            admin-api.mdx
            support-api.mdx
            sales-api.mdx
            marketing-api.mdx
          errors.mdx
          configuration.mdx
        advanced/
          architecture.mdx
          plugins.mdx
          custom-generators.mdx
          monorepo.mdx
          performance.mdx
          scaling.mdx
          ai-agents.mdx
        contributing/
          index.mdx
          development-setup.mdx
          coding-standards.mdx
          testing-guide.mdx
          writing-docs.mdx
        changelog.mdx
        faq.mdx
        troubleshooting.mdx
        glossary.mdx
```

---

## Page Templates

Every documentation page should follow a consistent template based on its quadrant.

### Tutorial Page Template

```markdown
---
title: "Tutorial: [Title]"
description: "Learn how to [outcome] by building [thing]"
sidebar:
  order: [N]
  badge:
    text: Tutorial
    variant: tip
---

## What You Will Build

[Screenshot or description of the end result]

## Prerequisites

- [What the reader needs to know/have before starting]

## Step 1: [First Step]

[Explanation of what we are doing and why]

\`\`\`typescript
// Code example
\`\`\`

[Explanation of what happened]

## Step 2: [Second Step]

[Continue pattern...]

## What You Learned

- [Key takeaway 1]
- [Key takeaway 2]

## Next Steps

- [Link to related tutorial]
- [Link to deeper guide]
```

### Guide (Concept) Page Template

```markdown
---
title: "[Concept Name]"
description: "Understanding [concept] in VibeonRails"
sidebar:
  order: [N]
  badge:
    text: Guide
    variant: note
---

## Overview

[What this concept is and why it exists. 2-3 paragraphs.]

## How It Works

[Detailed explanation of the concept with diagrams if helpful]

### [Sub-concept 1]

[Explanation with code examples]

### [Sub-concept 2]

[Explanation with code examples]

## Architecture

[How this fits into the broader system]

## Best Practices

- [Practice 1 with explanation]
- [Practice 2 with explanation]

## Common Patterns

[Patterns developers commonly use]

## See Also

- [Related guide]
- [Related how-to]
- [Related reference]
```

### How-To (Recipe) Page Template

```markdown
---
title: "How to [Do Thing]"
description: "Step-by-step guide to [achieve outcome]"
sidebar:
  order: [N]
  badge:
    text: How-To
    variant: caution
---

## Problem

[What the reader is trying to achieve]

## Solution

### Step 1: [Action]

\`\`\`typescript
// Code
\`\`\`

### Step 2: [Action]

\`\`\`typescript
// Code
\`\`\`

## Complete Example

\`\`\`typescript
// Full working example
\`\`\`

## Variations

- [Alternative approach 1]
- [Alternative approach 2]

## Troubleshooting

- **Problem**: [Common issue] -> **Solution**: [Fix]

## Related

- [Guide: Understanding the concept]
- [Reference: API details]
```

### Reference Page Template

```markdown
---
title: "[Function/Class Name]"
description: "API reference for [name]"
sidebar:
  order: [N]
  badge:
    text: Reference
    variant: danger
---

## Signature

\`\`\`typescript
function name(param1: Type, param2: Type): ReturnType
\`\`\`

## Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `param1` | `Type` | Yes | - | Description |
| `param2` | `Type` | No | `default` | Description |

## Returns

`ReturnType` - Description of what is returned.

## Examples

### Basic Usage

\`\`\`typescript
// Example
\`\`\`

### Advanced Usage

\`\`\`typescript
// Example
\`\`\`

## Errors

| Error | When | Solution |
|-------|------|----------|
| `ErrorName` | Condition | Fix |

## Source

[Link to source code on GitHub]
```

---

## Writing Standards

### Voice and Tone

- **Direct**: Use "you" (second person). "You can create a server by..."
- **Active voice**: "The middleware validates the token" not "The token is validated by the middleware"
- **Present tense**: "This function returns" not "This function will return"
- **No jargon without explanation**: First use of a term links to the glossary
- **No assumptions**: State prerequisites explicitly

### Code Examples

- Every concept must have a code example
- Code must be **copy-pasteable** and **runnable**
- Use real-world variable names (not `foo`, `bar`)
- Show imports at the top of every code block
- Highlight the important lines with comments
- Show both the minimal example AND a complete example

### Structure Rules

1. **One concept per page**: Do not combine "Schema" and "Migrations" on one page
2. **Front-load the answer**: Start with what the reader needs, not background
3. **Progressive disclosure**: Simple first, complex later
4. **Cross-reference aggressively**: Link to related pages everywhere
5. **Every page stands alone**: A reader landing from Google should understand the page
6. **Max 2000 words per page**: Split longer content into sub-pages

### Required Sections by Quadrant

| Section | Tutorial | Guide | How-To | Reference |
|---------|----------|-------|--------|-----------|
| Prerequisites | Required | Optional | Optional | No |
| Overview | No | Required | No | No |
| Step-by-step | Required | No | Required | No |
| Concepts/Why | Brief | Required | No | No |
| Code examples | Required | Required | Required | Required |
| Complete example | Required | Optional | Required | Optional |
| Parameters table | No | No | No | Required |
| Return values | No | No | No | Required |
| Best practices | No | Required | Optional | No |
| Troubleshooting | Optional | Optional | Required | Optional |
| See also / Related | Required | Required | Required | Required |

---

## Tooling

### Why Astro Starlight

[Astro Starlight](https://starlight.astro.build/) is the best documentation framework because:

1. **Built for docs**: Not a general-purpose framework adapted for docs
2. **Fast**: Static site generation, zero JS by default
3. **Search built-in**: Pagefind search, no external service needed
4. **Sidebar from file structure**: Auto-generated navigation
5. **MDX support**: Interactive components in markdown
6. **i18n ready**: Multi-language support
7. **Accessible**: WCAG compliant out of the box
8. **TypeScript**: Full type safety for config and components
9. **Component islands**: Add interactive React/Vue components where needed
10. **Dark mode**: Built-in theme switching

### Deployment Options

- **Vercel**: Zero-config, best for Astro
- **Netlify**: One-click deploy
- **Cloudflare Pages**: Edge-deployed, fast globally
- **GitHub Pages**: Free, good for open source

---

## The Docs Module for Users

Currently, VibeonRails does **not** have a dedicated docs module. We have:
- A knowledge base loader stub in `@vibeonrails/support`
- Markdown processing for emails in `@vibeonrails/infra`
- The `docs/` folder for our own framework docs

### Proposal: `@vibeonrails/docs` Package

We should create a `@vibeonrails/docs` package that:

1. **Wraps Astro Starlight** with VibeonRails conventions
2. **Provides a `vibe docs` CLI command** to:
   - `vibe docs init` - Scaffold a docs site in the project
   - `vibe docs dev` - Start docs dev server
   - `vibe docs build` - Build static docs site
   - `vibe docs deploy` - Deploy to Vercel/Netlify/Cloudflare
3. **Auto-generates API reference** from TypeScript types and JSDoc
4. **Reads SKILL.md files** and includes them in docs
5. **Provides components** for common doc patterns:
   - `<ApiReference>` - Renders function signature + params table
   - `<CodeExample>` - Tabbed code examples (TypeScript/JavaScript)
   - `<PackageInstall>` - Shows install command for npm/pnpm/yarn
   - `<StatusBadge>` - Shows feature status (stable/beta/experimental)
   - `<PropTable>` - Component props table
   - `<Callout>` - Tip/Warning/Note/Danger callouts

### Architecture

```
packages/docs/
  src/
    cli/           # CLI commands (init, dev, build, deploy)
    starlight/     # Starlight configuration presets
    components/    # Custom doc components
    plugins/       # Remark/Rehype plugins
      api-gen.ts   # Auto-generate API docs from TS types
      skill-md.ts  # Include SKILL.md content
    templates/     # Doc site templates
    index.ts       # Public API
  SKILL.md
  package.json
```

---

## Dogfooding

The meta-goal: **use `@vibeonrails/docs` to build the VibeonRails documentation site itself.**

### Implementation Order

1. **Phase 1** (now): Set up Astro Starlight directly in `docs/`
2. **Phase 2**: Extract common patterns into `@vibeonrails/docs` package
3. **Phase 3**: Migrate `docs/` to use `@vibeonrails/docs`
4. **Phase 4**: Ship `@vibeonrails/docs` for end users

This way:
- We ship useful docs immediately (Phase 1)
- We learn what patterns are worth extracting (Phase 2)
- We prove the module works by using it ourselves (Phase 3)
- Users get a battle-tested docs module (Phase 4)

---

## Content Priority

Not all 135 pages need to be written at once. Priority order:

### P0 - Ship First (core user journey)
1. Getting Started (5 pages)
2. Tutorials: Your First App, Authentication (2 pages)
3. Guides: Database (all 9 pages), API (all 8 pages), Security overview
4. Reference: Most-used APIs (createServer, createDatabase, JWT)

### P1 - Essential (within 2 weeks)
5. All remaining Guides (security, web, infra, CLI)
6. All How-To recipes for common tasks
7. Feature docs (payments, admin)

### P2 - Complete (within 1 month)
8. All remaining How-To recipes
9. All remaining Feature docs
10. All Reference pages
11. Advanced topics

### P3 - Polish (ongoing)
12. Contributing guide
13. FAQ, Troubleshooting, Glossary
14. Changelog
15. Video tutorials (embedded)
16. Interactive examples (StackBlitz/CodeSandbox)
