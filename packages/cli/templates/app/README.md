# {{projectName}}

Built with [Vibe on Rails](https://github.com/vibeonrails/vibeonrails) — The TypeScript Framework for Vibe Coding.

## Getting Started

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Start the development server
pnpm run dev
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start development server with hot reload |
| `pnpm run build` | Build for production |
| `pnpm run start` | Start production server |
| `pnpm run test` | Run tests |
| `pnpm run lint` | Lint source code |
| `pnpm run validate` | Full check: typecheck + lint + test + build |
| `pnpm run db:migrate` | Run database migrations |
| `pnpm run db:seed` | Seed the database |
| `pnpm run db:studio` | Open Drizzle Studio |

## Project Structure

```
├── .plan/                # Planning system (project context, roadmap, decisions)
├── drizzle.config.ts     # Drizzle Kit migration config
├── src/
│   ├── config/           # App configuration
│   │   ├── app.ts        # App name, port, environment flags
│   │   ├── database.ts   # Database client
│   │   └── env.ts        # Zod-validated environment variables
│   ├── modules/          # Feature modules
│   │   ├── auth/         # Authentication (register, login, refresh, me)
│   │   ├── user/         # User management (profile, list)
│   │   └── post/         # Posts example (CRUD with ownership)
│   ├── database/
│   │   └── seeds/        # Development and test seed scripts
│   ├── main.ts           # Server entry point
│   └── router.ts         # Root tRPC router (merges all modules)
```

## Built-in Modules

| Module | Endpoints | Auth |
|--------|-----------|------|
| **auth** | register, login, refresh, me | Public (except `me`) |
| **user** | getProfile, updateProfile, list, getById | Protected |
| **post** | list, getById, create, update, remove | Mixed |

## Generating Modules

```bash
# Generate a new module
npx vibe generate module order
npx vibe generate module blog-post
```

Each module comes with types, service, controller, test, SKILL.md, and barrel export — all wired up and ready to use.

Then wire it into `src/router.ts`:

```typescript
import { orderRouter } from "./modules/order/order.controller.js";

export const appRouter = createAppRouter({
  auth: authRouter,
  user: userRouter,
  post: postRouter,
  order: orderRouter, // ← new module
});
```

## Planning System

The `.plan/` directory provides context for AI agents and team members:

| File | Purpose |
|------|---------|
| `PROJECT.md` | What this app does |
| `CONTEXT.md` | Technical constraints and patterns |
| `ROADMAP.md` | Feature roadmap |
| `CURRENT.md` | Active sprint / tasks |
| `DECISIONS.md` | Architecture decision log |
