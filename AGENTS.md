# Vibe on Rails (VibeOnRails)

## What We're Building
A full-stack TypeScript framework designed for AI-assisted development. Predictable conventions, SKILL.md in every folder, zero ambiguity for humans and AI.

## Tech Stack
- **Language**: TypeScript (strict mode)
- **Monorepo**: Turborepo with pnpm workspaces
- **HTTP Server**: Hono (fast, edge-ready)
- **API Layer**: tRPC (end-to-end type safety)
- **Database**: Drizzle ORM (type-safe SQL)
- **Validation**: Zod (schema validation)
- **Auth**: jose (JWT) + Argon2 (password hashing)
- **Queue**: BullMQ (Redis-based)
- **Email**: Resend
- **Testing**: Vitest
- **Package Manager**: pnpm

## Project Structure
```
packages/
├── core/          # API (Hono + tRPC), Database (Drizzle), Security (JWT + Argon2)
├── infra/         # Health, Logging, Queue, Email, Cache, Storage
├── cli/           # CLI: create projects, generate modules, dev/build/db commands
├── web/           # Frontend: CSS system, React components, hooks, tRPC client, routing
specs/             # Feature specifications
ai-workflow/       # AI workflow templates, agents, rules, skills
```

## Commands
```bash
pnpm install          # Install dependencies
pnpm run dev          # Start dev server
pnpm run test         # Run tests
pnpm run typecheck    # Type check
pnpm run lint         # Lint
pnpm run build        # Build all packages
pnpm run validate     # Full check: typecheck + lint + test + build + git add
```

## Code Style
- TypeScript strict mode, no `any` (use `unknown` if needed)
- Functions under 50 lines, single responsibility
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`
- Colocated tests: `feature.test.ts` next to `feature.ts`
- Barrel exports: every module has `index.ts`

## Architecture Rules
- Each package has a SKILL.md that teaches AI agents how to use it
- Packages export via barrel pattern: `@vibeonrails/core/api`, `@vibeonrails/core/database`
- All user input validated with Zod schemas
- Use tRPC procedures: `publicProcedure`, `protectedProcedure`
- Database queries use Drizzle ORM, no raw SQL unless necessary
- Error handling: throw `AppError` subclasses (`NotFoundError`, `ValidationError`)

## Testing Rules
- Tests first (TDD): write failing test, then implement
- Fix the implementation, never the test (unless test is wrong)
- Colocate tests: `feature.test.ts` next to `feature.ts`
- Use Vitest for all testing

## CLI Commands
- `vibe create <name>` — Scaffold new project
- `vibe generate module <name>` — Generate a module
- `vibe dev` — Start dev server
- `vibe db migrate|seed|reset|studio` — Database operations
- `vibe build` — Production build

## Current Status
- ✅ Monorepo structure with Turborepo + pnpm
- ✅ @vibeonrails/core: API, Database, Security, Shared
- ✅ @vibeonrails/infra: Health, Logging, Queue, Email, Cache, Storage
- ✅ @vibeonrails/cli: create, generate module, dev, db, build commands
- ✅ @vibeonrails/web: CSS system, React components (Button, Input, Select, Modal, Toast, DataTable, Card, List, FormField, PageLayout, Header, Sidebar), hooks (useAuth, useApi), routing (defineRoutes)
- ✅ App Template (backend): config, auth, user, post modules, seeds, planning system
- ✅ Module Template: types, service, controller, test, index, SKILL.md
- ✅ AI workflow integrated
- 📋 Next: @vibeonrails/core gaps (seeds, repos, sessions, OAuth), then @vibeonrails/infra gaps

## Important Notes
- Don't add dependencies without discussing (keep the stack minimal)
- Every package must have a SKILL.md that explains its purpose and usage
- Follow "Convention over Configuration" philosophy
- All code must be AI-agent-friendly (clear patterns, predictable structure)
