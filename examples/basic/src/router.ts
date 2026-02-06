/**
 * Application Router — Basic Example
 *
 * Merges all module routers into a single tRPC router.
 * This is the central routing configuration for the app.
 */

import {
  createAppRouter,
  router,
  publicProcedure,
  protectedProcedure,
} from "@vibeonrails/core/api";
import { z } from "zod";

// --- Auth Router ---

const authRouter = router({
  /** Public: health check */
  ping: publicProcedure.query(() => {
    return { status: "ok", timestamp: new Date().toISOString() };
  }),

  /** Protected: get current user info */
  me: protectedProcedure.query(({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      role: ctx.user.role,
    };
  }),
});

// --- Post Router ---

interface Post {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: string;
}

// In-memory store for demonstration
const posts: Post[] = [
  {
    id: "1",
    title: "Hello from Vibe on Rails",
    content: "This is a basic example showing the module pattern.",
    authorId: "system",
    createdAt: new Date().toISOString(),
  },
];

const postRouter = router({
  /** List all posts */
  list: publicProcedure.query(() => {
    return posts;
  }),

  /** Get a single post by ID */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const post = posts.find((p) => p.id === input.id);
      if (!post) {
        throw new Error(`Post ${input.id} not found`);
      }
      return post;
    }),

  /** Create a new post (requires authentication) */
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        content: z.string().min(1),
      }),
    )
    .mutation(({ ctx, input }) => {
      const post: Post = {
        id: String(posts.length + 1),
        title: input.title,
        content: input.content,
        authorId: ctx.user.id,
        createdAt: new Date().toISOString(),
      };
      posts.push(post);
      return post;
    }),
});

// --- App Router ---

export const appRouter = createAppRouter({
  auth: authRouter,
  post: postRouter,
});

export type AppRouter = typeof appRouter;
