import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node22",
  splitting: false,
  banner: {
    js: "#!/usr/bin/env node",
  },
  external: [
    // Dynamic import — resolved at runtime, not bundled
    "@vibeonrails/docs/generator",
  ],
});
