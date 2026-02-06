/**
 * Vibe on Rails — Basic Example
 *
 * A minimal API server demonstrating core features:
 * - Hono HTTP server with tRPC integration
 * - Health check endpoint
 * - Authentication with JWT
 * - Module-based routing
 */

import { createServer } from '@vibeonrails/core/api';
import { registerHealthCheck, memoryHealthCheck } from '@vibeonrails/infra/health';
import { appRouter } from './router.js';

// Register health checks
registerHealthCheck('memory', memoryHealthCheck);

// Create the server with tRPC router
const app = createServer({
  router: appRouter,
  trpcPath: '/trpc',
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
});

// Start listening
const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};

console.log(`Basic example server running on http://localhost:${port}`);
console.log(`  Health:  http://localhost:${port}/health`);
console.log(`  tRPC:    http://localhost:${port}/trpc`);
