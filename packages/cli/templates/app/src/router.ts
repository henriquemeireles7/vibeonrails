import { createAppRouter } from "@vibeonrails/core/api";
import { authRouter } from "./modules/auth/auth.controller.js";
import { userRouter } from "./modules/user/user.controller.js";
import { postRouter } from "./modules/post/post.controller.js";

// ---------------------------------------------------------------------------
// Root Router — merges all module routers
// ---------------------------------------------------------------------------

export const appRouter = createAppRouter({
  auth: authRouter,
  user: userRouter,
  post: postRouter,
});

export type AppRouter = typeof appRouter;
