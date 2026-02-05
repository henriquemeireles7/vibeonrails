# @aor/core Skill

## Purpose

The `@aor/core` package provides the fundamental building blocks for every Agent on Rails application:

- **API**: Hono HTTP server + tRPC for type-safe endpoints
- **Database**: Drizzle ORM with PostgreSQL, schema definitions, and migrations
- **Security**: JWT authentication, Argon2 password hashing, and authorization guards
- **Shared**: Error classes, TypeScript types, and utility functions

## Structure

```
packages/core/
├── src/
│   ├── api/                          # API layer
│   │   ├── server.ts                 # Hono server factory
│   │   ├── router.ts                 # Router factory
│   │   ├── trpc.ts                   # tRPC setup (router, procedures)
│   │   ├── context.ts                # Request context (JWT extraction)
│   │   ├── middleware/
│   │   │   ├── error-handler.ts      # Structured error responses
│   │   │   └── rate-limit.ts         # IP-based rate limiting
│   │   └── index.ts
│   ├── database/                     # Database layer
│   │   ├── client.ts                 # Drizzle client factory
│   │   ├── migrate.ts                # Migration runner
│   │   ├── schema/
│   │   │   ├── user.ts               # Users table
│   │   │   ├── post.ts               # Posts table
│   │   │   ├── relations.ts          # Table relationships
│   │   │   └── index.ts
│   │   └── index.ts
│   ├── security/                     # Security layer
│   │   ├── auth/
│   │   │   ├── jwt.ts                # JWT sign/verify
│   │   │   └── password.ts           # Argon2 hash/verify
│   │   ├── authorization/
│   │   │   └── guards.ts             # Role & ownership checks
│   │   └── index.ts
│   ├── shared/                       # Shared utilities
│   │   ├── errors/index.ts           # Error classes with codes
│   │   ├── types/index.ts            # TypeScript type definitions
│   │   ├── utils/index.ts            # Utility functions
│   │   └── index.ts
│   └── index.ts                      # Main barrel export
├── SKILL.md
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## Patterns

### Creating a new API module

1. Create directory: `src/core/api/modules/{name}/`
2. Create types first: `{name}.types.ts` with Zod schemas
3. Create service: `{name}.service.ts` with business logic
4. Create controller: `{name}.controller.ts` with tRPC router
5. Register in the app router

### Adding a new database table

1. Create schema file: `src/database/schema/{name}.ts`
2. Export from `src/database/schema/index.ts`
3. Add relations in `src/database/schema/relations.ts`
4. Run `npx aor db:migrate` to generate migration

### Adding authorization

```typescript
// In controller:
import { requireRole, requireOwnership } from '@aor/core/security';

deletePost: protectedProcedure
  .input(z.object({ id: z.string().uuid() }))
  .mutation(async ({ ctx, input }) => {
    const post = await postService.findById(input.id);
    requireOwnership(post.authorId)(ctx);
    return postService.delete(input.id);
  }),
```

## Pitfalls

1. **Never import frontend code** — Backend must not depend on web packages
2. **Always validate input** — Use Zod schemas on every tRPC procedure
3. **Always check ownership** — Before update/delete, verify user permissions
4. **Use transactions** — For multi-step database operations
5. **Never expose password hashes** — Use `omit(user, ['passwordHash'])` in responses
