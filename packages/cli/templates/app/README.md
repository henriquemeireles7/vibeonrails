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
src/
├── main.ts           # Server entry point
├── router.ts         # Root tRPC router (merges all modules)
├── database/         # Drizzle config and seeds
└── modules/          # Feature modules (generate with `vibe generate module <name>`)
    └── <module>/
        ├── types.ts              # Zod schemas and TypeScript types
        ├── <module>.service.ts   # Business logic
        ├── <module>.controller.ts # tRPC controller
        ├── <module>.service.test.ts # Tests
        └── index.ts              # Barrel export
```

## Generating Modules

```bash
# Generate a new module
npx vibe generate module user
npx vibe generate module blog-post
```

Each module comes with types, service, controller, test, and barrel export — all wired up and ready to use.
