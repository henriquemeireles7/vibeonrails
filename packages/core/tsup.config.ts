import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "api/index": "src/api/index.ts",
    "database/index": "src/database/index.ts",
    "security/index": "src/security/index.ts",
    "shared/index": "src/shared/index.ts",
    "errors/index": "src/errors/index.ts",
    "config/index": "src/config/index.ts",
    "manifest/index": "src/manifest/index.ts",
    "env/index": "src/env/index.ts",
    "content/index": "src/content/index.ts",
    "webhooks/index": "src/webhooks/index.ts",
    "api-keys/index": "src/api-keys/index.ts",
    "integrations/index": "src/integrations/index.ts",
    "conventions/index": "src/conventions/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node22",
  splitting: false,
});
