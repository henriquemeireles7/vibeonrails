/**
 * Full-Stack Integration Test Suite
 *
 * Tests the complete VoR workflow: module registry, file operations,
 * content processing, and path conventions.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

// Test module registry integration
import {
  MODULE_REGISTRY,
  getModule,
  getModulesByCategory,
  resolveDependencies,
} from "../../packages/cli/src/modules/registry.js";

// Test add/remove integration
import {
  installModuleFiles,
  loadManifest,
  saveManifest,
  computeChecksum,
} from "../../packages/cli/src/commands/add.js";
import { removeModuleFiles } from "../../packages/cli/src/commands/remove.js";

// Test path conventions
import {
  pathFor,
  toKebabCase,
  toPascalCase,
} from "../../packages/core/src/conventions/paths.js";

// Test markdown cache
import {
  MarkdownCache,
  parseFrontmatter,
  extractHeadings,
} from "../../packages/cli/src/build/markdown-cache.js";

// Test image cache
import {
  ImageCache,
  isSupportedImage,
} from "../../packages/cli/src/build/image-cache.js";

// Test file watcher classification
import {
  classifyChange,
  batchChanges,
} from "../../packages/cli/src/dev/watcher.js";

describe("Integration: Module Registry + Add/Remove", () => {
  const testDir = join(tmpdir(), "vibe-integration-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should install and remove a module end-to-end", () => {
    // Install marketing module files
    const installed = installModuleFiles("marketing", testDir);
    expect(installed.length).toBeGreaterThan(0);

    // Save to manifest
    const manifest = loadManifest(testDir);
    manifest.modules["marketing"] = {
      name: "marketing",
      package: "@vibeonrails/marketing",
      installedAt: new Date().toISOString(),
      files: installed,
    };
    saveManifest(testDir, manifest);

    // Verify files exist
    for (const file of installed) {
      expect(existsSync(join(testDir, file.path))).toBe(true);
    }

    // Remove the module
    const result = removeModuleFiles("marketing", testDir);
    expect(result.removed.length).toBe(installed.length);
    expect(result.modified).toEqual([]);

    // Verify files are gone
    for (const file of installed) {
      expect(existsSync(join(testDir, file.path))).toBe(false);
    }
  });

  it("should detect modified files during removal", () => {
    const installed = installModuleFiles("marketing", testDir);

    // Save manifest
    const manifest = loadManifest(testDir);
    manifest.modules["marketing"] = {
      name: "marketing",
      package: "@vibeonrails/marketing",
      installedAt: new Date().toISOString(),
      files: installed,
    };
    saveManifest(testDir, manifest);

    // Modify one file
    if (installed.length > 0) {
      const firstFile = installed[0]!;
      writeFileSync(join(testDir, firstFile.path), "user modified content");

      const result = removeModuleFiles("marketing", testDir);
      expect(result.modified.length).toBe(1);
      expect(result.modified[0]).toBe(firstFile.path);
    }
  });
});

describe("Integration: Path Conventions", () => {
  it("should generate consistent paths across the framework", () => {
    // Module paths
    const servicePath = pathFor("module", "order", "service");
    expect(servicePath).toBe("src/modules/order/order.service.ts");

    // Component paths
    const componentPath = pathFor("component", "data-table");
    expect(componentPath).toBe("src/web/components/DataTable/DataTable.tsx");

    // Content paths
    const blogPath = pathFor("content", "blog", "my-post");
    expect(blogPath).toBe("content/blog/my-post.md");

    // Heuristic paths
    const hookPath = pathFor("heuristic", "hook", "pain-point");
    expect(hookPath).toBe("content/marketing/heuristics/hooks/pain-point.md");

    // All paths should be deterministic
    expect(pathFor("module", "order", "service")).toBe(servicePath);
  });
});

describe("Integration: Markdown Cache + Content", () => {
  const testDir = join(tmpdir(), "vibe-md-integration-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should parse and cache markdown files", () => {
    // Create a blog post
    const blogDir = join(testDir, "content", "blog");
    mkdirSync(blogDir, { recursive: true });

    writeFileSync(
      join(blogDir, "post-1.md"),
      `---
title: Hello World
author: test
draft: false
---

# Introduction

This is a test blog post with **markdown** content.

## Section One

More content here.
`,
    );

    const cache = new MarkdownCache(testDir);
    const result = cache.parse(join(blogDir, "post-1.md"));

    expect(result.frontmatter["title"]).toBe("Hello World");
    expect(result.frontmatter["draft"]).toBe(false);
    expect(result.headings).toHaveLength(2);
    expect(result.headings[0]!.text).toBe("Introduction");
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.excerpt).toBeTruthy();

    // Second parse should hit cache
    cache.parse(join(blogDir, "post-1.md"));
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });
});

describe("Integration: Image Cache", () => {
  const testDir = join(tmpdir(), "vibe-img-integration-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should cache and retrieve images", () => {
    const cache = new ImageCache(testDir);
    const fakeImage = Buffer.from("fake image data for testing");

    // Store an optimized version
    const outputPath = cache.set(
      "/source/hero.jpg",
      "abc123",
      640,
      "webp",
      fakeImage,
    );
    expect(existsSync(outputPath)).toBe(true);

    // Should be a cache hit
    expect(cache.has("abc123", 640, "webp")).toBe(true);
    expect(cache.has("abc123", 1024, "webp")).toBe(false);
  });
});

describe("Integration: File Watcher Classification", () => {
  it("should correctly route different file types", () => {
    const root = "/project";

    // API changes
    expect(
      classifyChange(`${root}/src/modules/user/service.ts`, root).type,
    ).toBe("api-reload");

    // Frontend changes
    expect(classifyChange(`${root}/src/web/pages/Home.tsx`, root).type).toBe(
      "vite-hmr",
    );

    // Content changes
    expect(classifyChange(`${root}/content/blog/post.md`, root).type).toBe(
      "content-rebuild",
    );

    // Config changes
    expect(classifyChange(`${root}/vibe.config.ts`, root).type).toBe(
      "config-restart",
    );

    // Schema changes
    expect(
      classifyChange(`${root}/src/database/schema/users.ts`, root).type,
    ).toBe("schema-change");
  });

  it("should batch and prioritize actions", () => {
    const actions = [
      classifyChange("/project/src/service.ts", "/project"),
      classifyChange("/project/vibe.config.ts", "/project"),
      classifyChange("/project/src/App.tsx", "/project"),
    ];

    const batched = batchChanges(actions);
    // Config restart should take priority
    expect(batched).toHaveLength(1);
    expect(batched[0]!.type).toBe("config-restart");
  });
});

describe("Integration: Module Registry Consistency", () => {
  it("should have all modules properly defined", () => {
    const ops = getModulesByCategory("ops");
    const features = getModulesByCategory("features");

    expect(ops.length).toBeGreaterThanOrEqual(5);
    expect(features.length).toBeGreaterThanOrEqual(2);

    // All modules should resolve dependencies without errors
    for (const mod of MODULE_REGISTRY) {
      const deps = resolveDependencies(mod.name);
      expect(deps).toContain(mod.name);
    }
  });
});
