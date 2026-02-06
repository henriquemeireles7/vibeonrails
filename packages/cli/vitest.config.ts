import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: [
      "node_modules/**",
      "dist/**",
      "templates/**", // Template files are scaffolded code, not CLI tests
    ],
  },
});
