import { z } from "zod";

// ---------------------------------------------------------------------------
// Post — Schemas
// ---------------------------------------------------------------------------

export const PostSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  published: z.boolean().default(false),
  authorId: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreatePostSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1),
  published: z.boolean().default(false),
});

export const UpdatePostSchema = CreatePostSchema.partial();

// ---------------------------------------------------------------------------
// Post — Types
// ---------------------------------------------------------------------------

export type Post = z.infer<typeof PostSchema>;
export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
