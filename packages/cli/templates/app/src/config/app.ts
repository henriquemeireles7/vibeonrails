import { env } from "./env.js";

// ---------------------------------------------------------------------------
// Application Config
// ---------------------------------------------------------------------------

export const appConfig = {
  name: "{{projectName}}",
  port: env.PORT,
  env: env.NODE_ENV,
  isDev: env.NODE_ENV === "development",
  isProd: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",
};
