# Vibe on Rails — SaaS Example

A full-featured SaaS application demonstrating all Vibe on Rails capabilities: authentication, user management, posts with CRUD, admin panel with role-based access, health checks, structured logging, and caching.

## Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL 15+ (optional — this example uses in-memory data)
- Redis 7+ (optional — for queue and cache)

## Setup

```bash
# From the monorepo root
pnpm install

# Or from this directory (after monorepo install)
cd examples/saas
```

## Environment Variables

Create a `.env` file (or export these variables):

```env
PORT=3000
NODE_ENV=development
JWT_SECRET=your-secret-key-at-least-32-characters-long
JWT_ISSUER=vibe-saas-example
CORS_ORIGIN=http://localhost:5173

# Optional — for full infra features
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vibe_saas
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=re_your_api_key
EMAIL_FROM=noreply@example.com
```

## Run

```bash
# Development (with hot reload)
pnpm dev

# Production build
pnpm build
pnpm start
```

## Endpoints

### Public Endpoints

| Endpoint           | Method | Description                      |
| ------------------ | ------ | -------------------------------- |
| `/health`          | GET    | Health check with service status |
| `/trpc/auth.ping`  | GET    | API health ping                  |
| `/trpc/auth.login` | POST   | Log in with email + password     |
| `/trpc/post.list`  | GET    | List published posts             |
| `/trpc/post.get`   | GET    | Get post by ID                   |

### Protected Endpoints (require JWT)

| Endpoint                   | Method | Description              |
| -------------------------- | ------ | ------------------------ |
| `/trpc/auth.me`            | GET    | Get current user         |
| `/trpc/user.profile`       | GET    | Get user profile         |
| `/trpc/user.updateProfile` | POST   | Update profile           |
| `/trpc/post.create`        | POST   | Create a post            |
| `/trpc/post.togglePublish` | POST   | Publish/unpublish a post |
| `/trpc/post.delete`        | POST   | Delete a post            |

### Admin Endpoints (require admin role)

| Endpoint                       | Method | Description                            |
| ------------------------------ | ------ | -------------------------------------- |
| `/trpc/admin.listUsers`        | GET    | List all users                         |
| `/trpc/admin.listPosts`        | GET    | List all posts (including unpublished) |
| `/trpc/admin.changeUserRole`   | POST   | Change user role                       |
| `/trpc/admin.toggleUserActive` | POST   | Activate/deactivate user               |
| `/trpc/admin.stats`            | GET    | Dashboard statistics                   |

## Testing the API

```bash
# Health check
curl http://localhost:3000/health

# List published posts
curl http://localhost:3000/trpc/post.list

# Login
curl -X POST http://localhost:3000/trpc/auth.login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password"}'

# Access protected route (replace YOUR_TOKEN with a real JWT)
curl http://localhost:3000/trpc/auth.me \
  -H "Authorization: Bearer YOUR_TOKEN"

# Admin stats (requires admin JWT)
curl http://localhost:3000/trpc/admin.stats \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

## Project Structure

```
examples/saas/
├── src/
│   ├── main.ts      # Server entry with health checks, logging, and cache
│   └── router.ts    # Full router: auth, user, post, admin modules
├── package.json
└── README.md
```

## Modules Demonstrated

| Module    | Features                                       |
| --------- | ---------------------------------------------- |
| **Auth**  | Login, token refresh, current user             |
| **User**  | Profile management, update                     |
| **Post**  | CRUD, publish/unpublish, ownership checks      |
| **Admin** | User management, role changes, dashboard stats |

## Architecture Notes

This example uses in-memory data stores for simplicity. In a real application, you would:

1. Replace in-memory arrays with Drizzle ORM queries (`@vibeonrails/core/database`)
2. Use real JWT signing with `signAccessToken` / `signRefreshToken` (`@vibeonrails/core/security`)
3. Add Redis cache with `createCache` (`@vibeonrails/infra/cache`)
4. Add background jobs with `defineJob` / `enqueue` (`@vibeonrails/infra/queue`)
5. Add email notifications with `sendEmail` (`@vibeonrails/infra/email`)

## Learn More

- [Getting Started](../../docs/src/pages/getting-started.md)
- [Core API Reference](../../docs/src/pages/core/api.md)
- [Security Reference](../../docs/src/pages/core/security.md)
- [Infrastructure Overview](../../docs/src/pages/infra/overview.md)
- [Admin Panel](../../docs/src/pages/features/admin.md)
- [Payments](../../docs/src/pages/features/payments.md)
