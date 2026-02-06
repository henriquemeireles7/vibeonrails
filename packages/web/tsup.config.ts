import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "styles/index": "src/styles/index.ts",
    "components/index": "src/components/index.ts",
    "hooks/index": "src/hooks/index.ts",
    "routing/index": "src/routing/index.ts",
  },
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  splitting: false,
  external: ["react", "react-dom", "@tanstack/react-query", "@trpc/client", "@trpc/react-query"],
  loader: {
    ".css": "copy",
  },
});
