import { defineRoutes } from "@vibeonrails/web/routing";

export const routes = defineRoutes({
  home: { path: "/", protected: false },
  login: { path: "/login", protected: false },
  register: { path: "/register", protected: false },
  dashboard: { path: "/dashboard", protected: true },
  posts: { path: "/posts", protected: true },
  post: { path: "/posts/:id", protected: true },
});
