# Vibe on Rails — Basic Example

A minimal Vibe on Rails application demonstrating the core features: Hono HTTP server, tRPC routing, JWT authentication, and health checks.

## Prerequisites

- Node.js 22+
- pnpm 9+

## Setup

```bash
# From the monorepo root
pnpm install

# Or from this directory (after monorepo install)
cd examples/basic
```

## Environment Variables

Create a `.env` file (or export these variables):

```env
PORT=3000
JWT_SECRET=your-secret-key-at-least-32-characters-long
JWT_ISSUER=vibe-basic-example
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

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | No | Health check |
| `/trpc/auth.ping` | GET | No | API ping |
| `/trpc/auth.me` | GET | Yes | Get current user |
| `/trpc/post.list` | GET | No | List all posts |
| `/trpc/post.get` | GET | No | Get post by ID |
| `/trpc/post.create` | POST | Yes | Create a new post |

## Testing the API

```bash
# Health check
curl http://localhost:3000/health

# List posts
curl http://localhost:3000/trpc/post.list

# Get a specific post
curl "http://localhost:3000/trpc/post.get?input=%7B%22id%22%3A%221%22%7D"
```

## Project Structure

```
examples/basic/
├── src/
│   ├── main.ts      # Server entry point
│   └── router.ts    # tRPC router with auth and post modules
├── package.json
└── README.md
```

## Learn More

- [Getting Started](../../docs/src/pages/getting-started.md)
- [Core API Reference](../../docs/src/pages/core/api.md)
- [Security Reference](../../docs/src/pages/core/security.md)
