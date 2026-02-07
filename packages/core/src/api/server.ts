/**
 * HTTP Server Factory
 *
 * Creates a Hono HTTP server with built-in middleware:
 * - CORS (requires explicit origins in production)
 * - Hardened security headers (CSP, HSTS)
 * - Body size limiting
 * - Rate limiting (auth endpoints)
 * - Request logging
 * - Error handling
 * - tRPC integration
 * - Health check endpoint
 *
 * Usage:
 *   import { createServer } from '@vibeonrails/core/api';
 *   import { appRouter } from './router';
 *
 *   const app = createServer({
 *     router: appRouter,
 *     corsOrigin: ['https://myapp.com'],
 *   });
 *   export default app;
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { trpcServer } from '@hono/trpc-server';
import type { AnyRouter } from '@trpc/server';
import { createContext } from './context.js';
import { errorHandler } from './middleware/error-handler.js';
import { hardenedHeaders } from './middleware/security-headers.js';
import { bodyLimit } from './middleware/body-limit.js';
import { rateLimit } from './middleware/rate-limit.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServerOptions {
  /** The tRPC router to serve */
  router: AnyRouter;
  /** Base path for tRPC endpoints (default: '/trpc') */
  trpcPath?: string;
  /**
   * CORS allowed origins. REQUIRED in production.
   * In development mode (NODE_ENV=development), defaults to allowing all origins.
   */
  corsOrigin?: string | string[];
  /** Maximum request body size in bytes (default: 1 MB). */
  maxBodySize?: number;
  /** Enable rate limiting on auth endpoints (default: true in production). */
  enableRateLimit?: boolean;
  /** Maximum requests per window for rate-limited endpoints (default: 20). */
  rateLimitMax?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDevelopment(): boolean {
  const env = process.env.NODE_ENV;
  return env === 'development' || env === 'test';
}

/**
 * Resolve the CORS origin setting.
 * - In development: allow all origins (reflect back the request origin).
 * - In production: require explicit origins or throw.
 */
function resolveCorsOrigin(
  corsOrigin: string | string[] | undefined,
): string | string[] | ((origin: string) => string) {
  if (corsOrigin) {
    return corsOrigin;
  }

  if (isDevelopment()) {
    return (origin: string) => origin;
  }

  throw new Error(
    '[vibeonrails] corsOrigin is required in production. ' +
      'Pass explicit origins to createServer({ corsOrigin: [...] }).',
  );
}

// ---------------------------------------------------------------------------
// Server Factory
// ---------------------------------------------------------------------------

/**
 * Create a fully configured Hono HTTP server.
 *
 * @param options - Server configuration
 * @returns Configured Hono app instance
 */
export function createServer(options: ServerOptions) {
  const {
    router,
    trpcPath = '/trpc',
    corsOrigin,
    maxBodySize,
    enableRateLimit,
    rateLimitMax = 20,
  } = options;

  const resolvedOrigin = resolveCorsOrigin(corsOrigin);
  const rateLimitEnabled = enableRateLimit ?? !isDevelopment();

  const app = new Hono();

  // Global middleware (order matters)
  app.use('*', errorHandler());
  app.use('*', logger());
  app.use('*', hardenedHeaders());
  app.use('*', bodyLimit({ maxSize: maxBodySize }));
  app.use(
    '*',
    cors({
      origin: resolvedOrigin,
      credentials: true,
    }),
  );

  // Rate limit auth-related tRPC endpoints
  if (rateLimitEnabled) {
    app.use(
      `${trpcPath}/auth.*`,
      rateLimit({ max: rateLimitMax }),
    );
  }

  // Health check endpoint (always available)
  app.get('/health', (c) =>
    c.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '0.1.0',
    }),
  );

  // tRPC API
  app.use(
    `${trpcPath}/*`,
    trpcServer({
      router,
      createContext: createContext as unknown as Parameters<typeof trpcServer>[0]['createContext'],
    }),
  );

  return app;
}
