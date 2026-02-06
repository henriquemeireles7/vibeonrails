import { z } from "zod";
import { router, protectedProcedure } from "@vibeonrails/core/api";
import { UserService } from "./user.service.js";
import { UpdateUserSchema } from "./user.types.js";

// ---------------------------------------------------------------------------
// User — tRPC Controller
// ---------------------------------------------------------------------------

export const userRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return UserService.findById(ctx.user.id);
  }),

  updateProfile: protectedProcedure
    .input(UpdateUserSchema)
    .mutation(async ({ ctx, input }) => {
      return UserService.update(ctx.user.id, input);
    }),

  list: protectedProcedure.query(async () => {
    // TODO: add admin-only guard
    return UserService.findAll();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      return UserService.findById(input.id);
    }),
});
