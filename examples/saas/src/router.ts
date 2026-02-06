/**
 * Application Router — SaaS Example
 *
 * Full SaaS router with auth, user management, posts, and admin routes.
 * Demonstrates all common patterns in a Vibe on Rails application.
 */

import {
  createAppRouter,
  router,
  publicProcedure,
  protectedProcedure,
  middleware,
} from "@vibeonrails/core/api";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

// --- Custom Middleware ---

/** Admin-only middleware: requires role === 'admin' */
const requireAdmin = middleware(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required.",
    });
  }
  return next({ ctx });
});

const adminProcedure = protectedProcedure.use(requireAdmin);

// --- In-Memory Data Store (for demonstration) ---

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  published: boolean;
  authorId: string;
  createdAt: string;
}

const users: User[] = [
  {
    id: "1",
    email: "admin@example.com",
    name: "Admin User",
    role: "admin",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    email: "user@example.com",
    name: "Regular User",
    role: "user",
    isActive: true,
    createdAt: new Date().toISOString(),
  },
];

const posts: Post[] = [
  {
    id: "1",
    title: "Welcome to Vibe on Rails SaaS",
    content:
      "This example shows a full SaaS application with auth, users, posts, and admin.",
    published: true,
    authorId: "1",
    createdAt: new Date().toISOString(),
  },
  {
    id: "2",
    title: "Getting Started with Modules",
    content:
      "Every feature in your app follows the same module pattern: types, service, controller.",
    published: true,
    authorId: "1",
    createdAt: new Date().toISOString(),
  },
];

// --- Auth Router ---

const authRouter = router({
  /** Public: health ping */
  ping: publicProcedure.query(() => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  })),

  /** Public: login (simplified for example) */
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
    )
    .mutation(({ input }) => {
      const user = users.find((u) => u.email === input.email);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      // In production, verify password with verifyPassword() and sign real JWT
      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        accessToken: "example-access-token",
        refreshToken: "example-refresh-token",
      };
    }),

  /** Protected: get current user */
  me: protectedProcedure.query(({ ctx }) => ({
    id: ctx.user.id,
    email: ctx.user.email,
    role: ctx.user.role,
  })),
});

// --- User Router ---

const userRouter = router({
  /** Protected: get user profile */
  profile: protectedProcedure.query(({ ctx }) => {
    const user = users.find((u) => u.id === ctx.user.id);
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
    };
  }),

  /** Protected: update profile */
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        email: z.string().email().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const user = users.find((u) => u.id === ctx.user.id);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      if (input.name) user.name = input.name;
      if (input.email) user.email = input.email;
      return { id: user.id, email: user.email, name: user.name };
    }),
});

// --- Post Router ---

const postRouter = router({
  /** Public: list published posts */
  list: publicProcedure.query(() => {
    return posts.filter((p) => p.published);
  }),

  /** Public: get post by ID */
  get: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      const post = posts.find((p) => p.id === input.id);
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }
      return post;
    }),

  /** Protected: create post */
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
        published: false,
        authorId: ctx.user.id,
        createdAt: new Date().toISOString(),
      };
      posts.push(post);
      return post;
    }),

  /** Protected: publish/unpublish a post */
  togglePublish: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      const post = posts.find(
        (p) => p.id === input.id && p.authorId === ctx.user.id,
      );
      if (!post) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }
      post.published = !post.published;
      return post;
    }),

  /** Protected: delete a post */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => {
      const index = posts.findIndex(
        (p) => p.id === input.id && p.authorId === ctx.user.id,
      );
      if (index === -1) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post not found" });
      }
      posts.splice(index, 1);
      return { success: true };
    }),
});

// --- Admin Router ---

const adminRouter = router({
  /** Admin: list all users */
  listUsers: adminProcedure.query(() => {
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
    }));
  }),

  /** Admin: list all posts (including unpublished) */
  listPosts: adminProcedure.query(() => {
    return posts;
  }),

  /** Admin: change user role */
  changeUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        role: z.enum(["user", "admin", "moderator"]),
      }),
    )
    .mutation(({ input }) => {
      const user = users.find((u) => u.id === input.userId);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      user.role = input.role;
      return { id: user.id, role: user.role };
    }),

  /** Admin: toggle user active status */
  toggleUserActive: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(({ input }) => {
      const user = users.find((u) => u.id === input.userId);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      user.isActive = !user.isActive;
      return { id: user.id, isActive: user.isActive };
    }),

  /** Admin: dashboard stats */
  stats: adminProcedure.query(() => ({
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.isActive).length,
    totalPosts: posts.length,
    publishedPosts: posts.filter((p) => p.published).length,
  })),
});

// --- App Router ---

export const appRouter = createAppRouter({
  auth: authRouter,
  user: userRouter,
  post: postRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
