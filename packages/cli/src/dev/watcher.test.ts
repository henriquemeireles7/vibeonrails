/**
 * HMR File Watcher — Tests
 *
 * Tests for file type routing, schema detection, content rebuild,
 * config restart, and SKILL.md regen.
 */

import { describe, it, expect, vi } from "vitest";
import {
  classifyChange,
  debounce,
  batchChanges,
  formatAction,
  DEFAULT_IGNORED,
  type FileAction,
} from "./watcher.js";

const PROJECT_ROOT = "/project";

describe("classifyChange", () => {
  it("should classify TypeScript API files as api-reload", () => {
    const action = classifyChange(
      "/project/src/modules/user/service.ts",
      PROJECT_ROOT,
    );
    expect(action.type).toBe("api-reload");
  });

  it("should classify React components as vite-hmr", () => {
    const action = classifyChange(
      "/project/src/web/pages/Home.tsx",
      PROJECT_ROOT,
    );
    expect(action.type).toBe("vite-hmr");
  });

  it("should classify JSX components as vite-hmr", () => {
    const action = classifyChange(
      "/project/src/components/Button.jsx",
      PROJECT_ROOT,
    );
    expect(action.type).toBe("vite-hmr");
  });

  it("should classify CSS as vite-hmr", () => {
    const action = classifyChange("/project/src/styles/main.css", PROJECT_ROOT);
    expect(action.type).toBe("vite-hmr");
  });

  it("should detect Drizzle schema changes", () => {
    const action = classifyChange(
      "/project/src/database/schema/users.ts",
      PROJECT_ROOT,
    );
    expect(action.type).toBe("schema-change");
    expect((action as { suggestion: string }).suggestion).toContain(
      "vibe db migrate",
    );
  });

  it("should not classify schema test files as schema changes", () => {
    const action = classifyChange(
      "/project/src/database/schema/users.test.ts",
      PROJECT_ROOT,
    );
    expect(action.type).not.toBe("schema-change");
  });

  it("should classify content markdown as content-rebuild", () => {
    const action = classifyChange(
      "/project/content/blog/my-post.md",
      PROJECT_ROOT,
    );
    expect(action.type).toBe("content-rebuild");
  });

  it("should classify MDX content as content-rebuild", () => {
    const action = classifyChange(
      "/project/content/help/getting-started.mdx",
      PROJECT_ROOT,
    );
    expect(action.type).toBe("content-rebuild");
  });

  it("should detect vibe.config.ts changes", () => {
    const action = classifyChange("/project/vibe.config.ts", PROJECT_ROOT);
    expect(action.type).toBe("config-restart");
    expect((action as { warning: string }).warning).toContain("restart");
  });

  it("should detect SKILL.md changes", () => {
    const action = classifyChange(
      "/project/src/modules/user/SKILL.md",
      PROJECT_ROOT,
    );
    expect(action.type).toBe("skillmd-regen");
  });

  it("should ignore test files", () => {
    const action = classifyChange(
      "/project/src/utils/helper.test.ts",
      PROJECT_ROOT,
    );
    expect(action.type).toBe("ignore");
  });
});

describe("debounce", () => {
  it("should delay function execution", async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    debounced();
    debounced();

    expect(fn).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should reset timer on subsequent calls", async () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced();
    await new Promise((resolve) => setTimeout(resolve, 50));
    debounced();
    await new Promise((resolve) => setTimeout(resolve, 50));
    debounced();

    expect(fn).not.toHaveBeenCalled();

    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("batchChanges", () => {
  it("should deduplicate by path", () => {
    const actions: FileAction[] = [
      { type: "api-reload", path: "src/service.ts" },
      { type: "api-reload", path: "src/service.ts" },
      { type: "vite-hmr", path: "src/App.tsx" },
    ];

    const batched = batchChanges(actions);
    expect(batched).toHaveLength(2);
  });

  it("should prioritize config-restart over other actions", () => {
    const actions: FileAction[] = [
      { type: "api-reload", path: "src/service.ts" },
      { type: "config-restart", path: "vibe.config.ts", warning: "restart" },
      { type: "vite-hmr", path: "src/App.tsx" },
    ];

    const batched = batchChanges(actions);
    expect(batched).toHaveLength(1);
    expect(batched[0]!.type).toBe("config-restart");
  });

  it("should handle empty input", () => {
    expect(batchChanges([])).toEqual([]);
  });
});

describe("formatAction", () => {
  it("should format api-reload", () => {
    expect(
      formatAction({ type: "api-reload", path: "src/service.ts" }),
    ).toContain("[API]");
  });

  it("should format vite-hmr", () => {
    expect(formatAction({ type: "vite-hmr", path: "src/App.tsx" })).toContain(
      "[HMR]",
    );
  });

  it("should format schema-change", () => {
    expect(
      formatAction({
        type: "schema-change",
        path: "schema.ts",
        suggestion: "migrate",
      }),
    ).toContain("[Schema]");
  });

  it("should format content-rebuild", () => {
    expect(
      formatAction({ type: "content-rebuild", path: "content/blog/post.md" }),
    ).toContain("[Content]");
  });

  it("should return empty string for ignore", () => {
    expect(formatAction({ type: "ignore", path: "test.json" })).toBe("");
  });
});

describe("DEFAULT_IGNORED", () => {
  it("should include common ignored patterns", () => {
    expect(DEFAULT_IGNORED).toContain("**/node_modules/**");
    expect(DEFAULT_IGNORED).toContain("**/dist/**");
    expect(DEFAULT_IGNORED).toContain("**/.git/**");
  });
});
