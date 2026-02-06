import { createServer } from "@vibeonrails/core/api";
import { appRouter } from "./router.js";

const port = Number(process.env["PORT"] ?? 3000);

const app = createServer({
  router: appRouter,
  cors: {
    origin: "*",
  },
});

console.log(`🚀 {{projectName}} running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
