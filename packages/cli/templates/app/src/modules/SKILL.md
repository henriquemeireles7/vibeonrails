# Modules — Feature Organization

## Pattern

Each module is a self-contained feature area with a consistent structure:

```
modules/<name>/
├── <name>.types.ts        # Zod schemas defining input/output shapes
├── <name>.service.ts      # Business logic (CRUD, validation, side effects)
├── <name>.controller.ts   # tRPC router wiring service to API endpoints
├── <name>.test.ts         # Unit tests for the service layer
└── SKILL.md               # Module-specific documentation (auto-generated)
```

## Creating a New Module

```bash
npx vibe generate module order
```

This generates the full module skeleton, then:
1. Open `src/router.ts` and import `orderRouter`
2. Add it to the `createAppRouter({})` call
3. Implement your business logic in the service

## Built-in Modules

| Module | Purpose | Auth |
|--------|---------|------|
| `auth` | Register, login, refresh tokens, get current user | Public (except `me`) |
| `user` | User profiles, list users | Protected |
| `post` | Example CRUD module with ownership checks | Mixed (list/read public, write protected) |

## Conventions

- **Types first**: Define Zod schemas before writing service logic
- **Services are pure**: No HTTP/tRPC concerns in services
- **Controllers are thin**: Just wire input validation to service calls
- **Tests target services**: Unit test business logic, not HTTP layer
