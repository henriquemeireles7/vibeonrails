import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "heuristics/index": "src/heuristics/index.ts",
    "transform/index": "src/transform/index.ts",
    "channels/index": "src/channels/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "node22",
  splitting: false,
});
