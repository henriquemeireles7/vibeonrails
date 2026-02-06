# Agent on Rails (VibeOnRails)

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
│   ├── src/api/
│   ├── src/database/
│   ├── src/security/
│   └── src/shared/
├── infra/         # Health, Logging, Queue, Email, Cache, Storage
│   ├── src/health/
│   ├── src/logging/
│   ├── src/queue/
│   └── src/email/
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
- Packages export via barrel pattern: `@aor/core/api`, `@aor/core/database`
- All user input validated with Zod schemas
- Use tRPC procedures: `publicProcedure`, `protectedProcedure`
- Database queries use Drizzle ORM, no raw SQL unless necessary
- Error handling: throw `AppError` subclasses (`NotFoundError`, `ValidationError`)

## Testing Rules
- Tests first (TDD): write failing test, then implement
- Fix the implementation, never the test (unless test is wrong)
- Colocate tests: `feature.test.ts` next to `feature.ts`
- Use Vitest for all testing

## Current Status
- ✅ Initial monorepo structure with Turborepo + pnpm
- ✅ Package.json with validate script
- ✅ AI workflow integrated (agents, rules, skills, templates)
- 🔄 Building out @aor/core and @aor/infra packages
- 📋 Next: Implement core modules following SKILL.md conventions

## Important Notes
- Don't add dependencies without discussing (keep the stack minimal)
- Every package must have a SKILL.md that explains its purpose and usage
- Follow "Convention over Configuration" philosophy
- All code must be AI-agent-friendly (clear patterns, predictable structure)
