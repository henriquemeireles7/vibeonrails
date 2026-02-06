/**
 * @vibeonrails/core/api - API module barrel export
 */

export { router, publicProcedure, protectedProcedure, middleware } from './trpc.js';
export { createContext } from './context.js';
export { createServer, type ServerOptions } from './server.js';
export { createAppRouter } from './router.js';
export { errorHandler } from './middleware/error-handler.js';
export { rateLimit } from './middleware/rate-limit.js';
