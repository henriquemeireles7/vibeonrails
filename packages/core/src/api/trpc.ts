/**
 * tRPC Configuration
 *
 * Sets up tRPC with typed context, public and protected procedures.
 * This is the foundation for all API endpoints.
 *
 * Usage in controllers:
 *   import { router, publicProcedure, protectedProcedure } from '@aor/core/api';
 */

import { initTRPC, TRPCError } from '@trpc/server';
import type { Context } from '../shared/types/index.js';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        docs: `https://aor.dev/errors/${error.code}`,
      },
    };
  },
});

/**
 * Create a new tRPC router.
 */
export const router = t.router;

/**
 * Public procedure - no authentication required.
 */
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authenticated user.
 * Throws UNAUTHORIZED if no user in context.
 */
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required. Include a valid Bearer token in the Authorization header.',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Middleware builder for custom middleware.
 */
export const middleware = t.middleware;
