import { router, publicProcedure, protectedProcedure } from "@vibeonrails/core/api";
import { AuthService } from "./auth.service.js";
import { RegisterSchema, LoginSchema, RefreshSchema } from "./auth.types.js";

// ---------------------------------------------------------------------------
// Auth — tRPC Controller
// ---------------------------------------------------------------------------

export const authRouter = router({
  register: publicProcedure
    .input(RegisterSchema)
    .mutation(async ({ input }) => {
      return AuthService.register(input);
    }),

  login: publicProcedure
    .input(LoginSchema)
    .mutation(async ({ input }) => {
      return AuthService.login(input);
    }),

  refresh: publicProcedure
    .input(RefreshSchema)
    .mutation(async ({ input }) => {
      return AuthService.refresh(input.refreshToken);
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    return AuthService.me(ctx.user.id);
  }),
});
