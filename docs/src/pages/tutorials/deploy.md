# Tutorial: Deploy to Production

In this tutorial, you'll deploy your Vibe on Rails application to production. We cover three popular platforms: **Railway** (easiest), **Fly.io** (edge deployment), and **Docker** (self-hosted). Each approach gives you a production-ready setup with PostgreSQL, environment variables, and HTTPS.

---

## Prerequisites

- A Vibe on Rails project that builds successfully (`pnpm build`)
- A PostgreSQL database (provided by the platform or self-hosted)
- Environment variables configured (see [Getting Started](../getting-started))

---

## Pre-Deployment Checklist

Before deploying, make sure:

- [ ] `pnpm build` completes without errors
- [ ] `pnpm test` passes
- [ ] All secrets are in environment variables (not hardcoded)
- [ ] `JWT_SECRET` is a strong, unique random string
- [ ] `NODE_ENV` is set to `production`
- [ ] CORS origin is set to your production domain
- [ ] Rate limiting is configured
- [ ] Database migrations are ready to run

---

## Option 1: Railway (Recommended for Getting Started)

[Railway](https://railway.app) provides the simplest deployment experience with automatic builds, managed PostgreSQL, and environment variable management.

### Step 1: Install the Railway CLI

```bash
npm install -g @railway/cli
railway login
```

### Step 2: Initialize the Project

```bash
cd my-app
railway init
```

Select "Empty Project" when prompted.

### Step 3: Add PostgreSQL

```bash
railway add --plugin postgresql
```

Railway automatically sets the `DATABASE_URL` environment variable.

### Step 4: Set Environment Variables

```bash
railway variables set JWT_SECRET="$(openssl rand -hex 32)"
railway variables set JWT_ISSUER="my-app"
railway variables set NODE_ENV="production"
railway variables set PORT="3000"
railway variables set CORS_ORIGIN="https://my-app.up.railway.app"
```

### Step 5: Configure the Build

Create or verify your `package.json` scripts:

```json
{
  "scripts": {
    "build": "pnpm vibe build",
    "start": "node dist/main.js",
    "db:migrate": "pnpm vibe db:migrate"
  }
}
```

### Step 6: Deploy

```bash
railway up
```

Railway will:

1. Detect your Node.js project
2. Run `pnpm install`
3. Run `pnpm build`
4. Start with `pnpm start`

### Step 7: Run Migrations

```bash
railway run pnpm db:migrate
```

### Step 8: Get Your URL

```bash
railway open
```

Your app is now live. Railway provides a `*.up.railway.app` domain with HTTPS automatically.

### Custom Domain

```bash
railway domain add my-app.com
```

Follow the DNS instructions Railway provides to point your domain.

---

## Option 2: Fly.io (Edge Deployment)

[Fly.io](https://fly.io) deploys your app to edge servers worldwide, giving you low latency globally.

### Step 1: Install the Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### Step 2: Create a Dockerfile

```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

# Enable pnpm
RUN corepack enable

# Install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Build
COPY . .
RUN pnpm build

# Production stage
FROM node:22-alpine
WORKDIR /app

RUN corepack enable

# Copy build output and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/pnpm-lock.yaml ./
COPY --from=builder /app/drizzle ./drizzle
RUN pnpm install --frozen-lockfile --prod

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

### Step 3: Launch

```bash
fly launch
```

Fly will detect the Dockerfile and configure your app. Choose a region close to your users.

### Step 4: Add PostgreSQL

```bash
fly postgres create --name my-app-db
fly postgres attach my-app-db
```

This sets the `DATABASE_URL` secret automatically.

### Step 5: Set Secrets

```bash
fly secrets set JWT_SECRET="$(openssl rand -hex 32)"
fly secrets set JWT_ISSUER="my-app"
fly secrets set NODE_ENV="production"
fly secrets set CORS_ORIGIN="https://my-app.fly.dev"
```

### Step 6: Deploy

```bash
fly deploy
```

### Step 7: Run Migrations

```bash
fly ssh console -C "node -e \"require('./dist/migrate.js')\""
```

Or add a release command to `fly.toml`:

```toml
[deploy]
  release_command = "node dist/migrate.js"
```

### Step 8: Verify

```bash
fly open
curl https://my-app.fly.dev/health
```

### Scaling

```bash
# Scale to 2 instances
fly scale count 2

# Scale to a larger machine
fly scale vm shared-cpu-2x
```

---

## Option 3: Docker (Self-Hosted)

For deploying to your own servers, Kubernetes, or any Docker-compatible hosting.

### Step 1: Create the Dockerfile

Use the same Dockerfile from the Fly.io section above.

### Step 2: Create docker-compose.yml

```yaml
version: "3.8"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/my_app
      - JWT_SECRET=${JWT_SECRET}
      - JWT_ISSUER=my-app
      - REDIS_URL=redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=my_app
      - POSTGRES_PASSWORD=postgres
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
  redisdata:
```

### Step 3: Create a .dockerignore

```
node_modules
dist
.env
.git
*.md
```

### Step 4: Build and Run

```bash
# Set your JWT secret
export JWT_SECRET=$(openssl rand -hex 32)

# Build and start all services
docker compose up -d --build

# Run migrations
docker compose exec app node dist/migrate.js

# Check logs
docker compose logs -f app
```

### Step 5: Verify

```bash
curl http://localhost:3000/health
```

### Production Hardening

For a production Docker deployment, also consider:

1. **Use a reverse proxy** — Put Nginx or Caddy in front for HTTPS termination:

```yaml
caddy:
  image: caddy:2-alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./Caddyfile:/etc/caddy/Caddyfile
    - caddy_data:/data
```

```
# Caddyfile
my-app.com {
  reverse_proxy app:3000
}
```

2. **Set resource limits** in docker-compose:

```yaml
app:
  deploy:
    resources:
      limits:
        cpus: "1.0"
        memory: 512M
```

3. **Use Docker secrets** instead of environment variables for sensitive data.

4. **Enable health checks** for the app container:

```yaml
app:
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
    interval: 30s
    timeout: 10s
    retries: 3
```

---

## Database Migrations in Production

Regardless of platform, you need a strategy for running migrations during deployment.

### Option A: Release Command

Run migrations before the new version starts serving traffic:

```bash
# Railway
railway run pnpm db:migrate

# Fly.io (in fly.toml)
[deploy]
  release_command = "node dist/migrate.js"
```

### Option B: Startup Migration

Run migrations when the app starts (simple but locks the database briefly):

```typescript
// src/main.ts
import { runMigrations } from "@vibeonrails/core/database";

const db = createDatabase(process.env.DATABASE_URL!);

// Run migrations on startup
await runMigrations(db);

// Then start the server
const app = createServer({ router: appRouter });
```

### Option C: Separate Migration Step

Run migrations as a separate CI/CD step before deploying the new version:

```yaml
# GitHub Actions example
- name: Run migrations
  run: pnpm db:migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

---

## Environment Variables Reference

| Variable                | Required | Description                               |
| ----------------------- | -------- | ----------------------------------------- |
| `NODE_ENV`              | Yes      | `production`                              |
| `PORT`                  | Yes      | Server port (usually `3000`)              |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string              |
| `JWT_SECRET`            | Yes      | JWT signing secret (32+ chars)            |
| `JWT_ISSUER`            | No       | JWT issuer claim                          |
| `CORS_ORIGIN`           | Yes      | Allowed CORS origin(s)                    |
| `REDIS_URL`             | No       | Redis connection string (for queue/cache) |
| `RESEND_API_KEY`        | No       | Email API key                             |
| `EMAIL_FROM`            | No       | Default sender email                      |
| `STRIPE_SECRET_KEY`     | No       | Stripe API key (for payments)             |
| `STRIPE_WEBHOOK_SECRET` | No       | Stripe webhook signing secret             |

---

## Monitoring in Production

Once deployed, set up monitoring:

### Health Checks

Use the built-in `/health` endpoint with your monitoring tool (UptimeRobot, Better Uptime, etc.):

```bash
curl https://my-app.com/health
# { "status": "healthy", "checks": { "database": { "status": "healthy" } } }
```

### Structured Logging

Vibe on Rails outputs JSON logs by default in production. Pipe these to your log aggregator (Datadog, Logtail, etc.):

```typescript
import { logger } from "@vibeonrails/infra/logging";

logger.info("Request processed", {
  method: "GET",
  path: "/api/users",
  duration: 45,
});
```

### Metrics

Expose a `/metrics` endpoint for Prometheus:

```typescript
import { getAllMetrics } from "@vibeonrails/infra/monitoring";

app.get("/metrics", async (c) => {
  const metrics = getAllMetrics();
  return c.json(metrics);
});
```

---

## Summary

| Platform | Best For                      | Setup Time  | Cost                   |
| -------- | ----------------------------- | ----------- | ---------------------- |
| Railway  | Quick deployment, small teams | ~5 minutes  | Free tier, then $5/mo+ |
| Fly.io   | Global edge deployment        | ~10 minutes | Free tier, then $2/mo+ |
| Docker   | Full control, self-hosted     | ~15 minutes | Your server cost       |

All three options give you:

- HTTPS (automatic or via reverse proxy)
- PostgreSQL
- Environment variable management
- Zero-downtime deployments

---

## Next Steps

- [Infrastructure Overview](../infra/overview) — Add logging, metrics, and health checks
- [Core Security Reference](../core/security) — Harden your auth setup
- [Payments](../features/payments) — Add Stripe billing
