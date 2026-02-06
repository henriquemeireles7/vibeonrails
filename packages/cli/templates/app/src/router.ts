import { createAppRouter } from "@vibeonrails/core/api";

// Import your module routers here:
// import { userRouter } from "./modules/user/index.js";
// import { postRouter } from "./modules/post/index.js";

export const appRouter = createAppRouter({
  // Register module routers:
  // user: userRouter,
  // post: postRouter,
});

export type AppRouter = typeof appRouter;
