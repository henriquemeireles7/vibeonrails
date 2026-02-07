# ---------------------------------------------------------------------------
# Stage 1: Base — Node.js + pnpm
# ---------------------------------------------------------------------------
FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ---------------------------------------------------------------------------
# Stage 2: Builder — install all deps and build
# ---------------------------------------------------------------------------
FROM base AS builder

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/ packages/
COPY templates/ templates/

RUN pnpm install --frozen-lockfile
RUN pnpm run build

# Prune dev dependencies after build
RUN pnpm prune --prod

# ---------------------------------------------------------------------------
# Stage 3: Runner — production image
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner

RUN corepack enable && corepack prepare pnpm@9 --activate

# Security: run as non-root user
RUN addgroup --system --gid 1001 appgroup \
    && adduser --system --uid 1001 appuser

WORKDIR /app

# Copy production dependencies and built output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml

# Switch to non-root user
USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "packages/core/dist/index.js"]
