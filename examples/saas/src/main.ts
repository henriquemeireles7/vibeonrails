/**
 * Vibe on Rails — SaaS Example
 *
 * A full-featured SaaS application demonstrating all framework capabilities:
 * - Hono HTTP server with tRPC integration
 * - Health checks with multiple services
 * - Structured logging
 * - Cache layer (Redis-compatible)
 * - Authentication with JWT
 * - Role-based access control
 * - Module-based routing with admin routes
 */

import { createServer } from '@vibeonrails/core/api';
import {
  registerHealthCheck,
  memoryHealthCheck,
  runHealthChecks,
} from '@vibeonrails/infra/health';
import { Logger } from '@vibeonrails/infra/logging';
import { appRouter } from './router.js';

// Set up structured logging
const logger = new Logger({ service: 'vibe-saas' });

// Register health checks
registerHealthCheck('memory', memoryHealthCheck);

registerHealthCheck('api', async () => {
  return { status: 'healthy' };
});

// NOTE: In a real app, you would also register database and Redis health checks:
//
// registerHealthCheck('database', async () => {
//   await db.execute(sql`SELECT 1`);
//   return { status: 'healthy' };
// });
//
// registerHealthCheck('redis', async () => {
//   await cache.ping();
//   return { status: 'healthy' };
// });

// Create the server
const app = createServer({
  router: appRouter,
  trpcPath: '/trpc',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
});

// Start listening
const port = Number(process.env.PORT) || 3000;

logger.info('SaaS example server starting', { port });

// Run initial health check
const health = await runHealthChecks();
logger.info('Health check results', { health });

export default {
  port,
  fetch: app.fetch,
};

logger.info('Server is ready', {
  url: `http://localhost:${port}`,
  health: `http://localhost:${port}/health`,
  trpc: `http://localhost:${port}/trpc`,
});
