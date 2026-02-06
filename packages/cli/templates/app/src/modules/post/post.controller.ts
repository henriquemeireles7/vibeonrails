import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "@vibeonrails/core/api";
import { PostService } from "./post.service.js";
import { CreatePostSchema, UpdatePostSchema } from "./post.types.js";

// ---------------------------------------------------------------------------
// Post — tRPC Controller
// ---------------------------------------------------------------------------

export const postRouter = router({
  list: publicProcedure.query(async () => {
    return PostService.findAll();
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return PostService.findById(input.id);
    }),

  create: protectedProcedure
    .input(CreatePostSchema)
    .mutation(async ({ ctx, input }) => {
      return PostService.create(ctx.user.id, input);
    }),

  update: protectedProcedure
    .input(z.object({ id: z.string().uuid(), data: UpdatePostSchema }))
    .mutation(async ({ ctx, input }) => {
      const post = await PostService.findById(input.id);
      if (!post) throw new Error("Post not found");
      if (post.authorId !== ctx.user.id) throw new Error("Not authorized");
      return PostService.update(input.id, input.data);
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const post = await PostService.findById(input.id);
      if (!post) throw new Error("Post not found");
      if (post.authorId !== ctx.user.id) throw new Error("Not authorized");
      return PostService.remove(input.id);
    }),
});
