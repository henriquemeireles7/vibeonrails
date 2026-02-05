/**
 * HTTP Server Factory
 *
 * Creates a Hono HTTP server with built-in middleware:
 * - CORS
 * - Secure headers
 * - Request logging
 * - Error handling
 * - tRPC integration
 * - Health check endpoint
 *
 * Usage:
 *   import { createServer } from '@aor/core/api';
 *   import { appRouter } from './router';
 *
 *   const app = createServer({ router: appRouter });
 *   export default app;
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';
import { trpcServer } from '@hono/trpc-server';
import type { AnyRouter } from '@trpc/server';
import { createContext } from './context.js';
import { errorHandler } from './middleware/error-handler.js';

export interface ServerOptions {
  /** The tRPC router to serve */
  router: AnyRouter;
  /** Base path for tRPC endpoints (default: '/trpc') */
  trpcPath?: string;
  /** CORS origin (default: allow all origins) */
  corsOrigin?: string | string[];
}

/**
 * Create a fully configured Hono HTTP server.
 *
 * @param options - Server configuration
 * @returns Configured Hono app instance
 */
export function createServer(options: ServerOptions) {
  const { router, trpcPath = '/trpc', corsOrigin } = options;

  const app = new Hono();

  // Global middleware
  app.use('*', errorHandler());
  app.use('*', logger());
  app.use('*', secureHeaders());
  app.use(
    '*',
    cors({
      origin: corsOrigin ?? ((origin) => origin),
      credentials: true,
    }),
  );

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
