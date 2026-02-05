/**
 * Base Router
 *
 * Provides a utility to create the application's main tRPC router.
 * The app imports feature routers and merges them here.
 *
 * Usage in app:
 *   import { createAppRouter } from '@aor/core/api';
 *   import { userRouter } from './modules/user/user.controller';
 *   import { postRouter } from './modules/post/post.controller';
 *
 *   export const appRouter = createAppRouter({
 *     user: userRouter,
 *     post: postRouter,
 *   });
 *   export type AppRouter = typeof appRouter;
 */

import { router } from './trpc.js';

/**
 * Create the main application router by merging feature routers.
 *
 * @param routes - Object mapping route names to tRPC routers
 * @returns Merged tRPC router
 */
export function createAppRouter<T extends Record<string, ReturnType<typeof router>>>(
  routes: T,
) {
  return router(routes);
}
