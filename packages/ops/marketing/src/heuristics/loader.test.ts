/**
 * Heuristics — Loader Tests
 *
 * Tests loading, filtering, validation, and git hash tracking.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  parseFrontmatter,
  loadHeuristics,
  loadHeuristicsByType,
  loadHeuristicById,
  loadActiveHeuristics,
  loadHeuristicsByTag,
  loadHeuristicFile,
} from "./loader.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_HOOK = `---
id: "attention-grabber"
title: "The Attention Grabber"
type: hook
format: question
emotion: "curiosity"
tags:
  - "social"
  - "twitter"
active: true
---

Are you still writing code the way you did 5 years ago?
`;

const VALID_CLIENT = `---
id: "indie-hacker"
title: "The Indie Hacker"
type: client
segment: "Solo founders"
desires:
  - "Ship faster"
  - "Reduce boilerplate"
problems:
  - "Too many SaaS tools"
  - "Context switching"
painBudget: high
channels:
  - "twitter"
  - "discord"
tags:
  - "primary"
active: true
---

Indie hackers building SaaS products who want to move fast.
`;

const VALID_PRODUCT = `---
id: "vor-framework"
title: "VoR Framework"
type: product
usp: "AI-native business operating system"
methodology: "Convention over Configuration"
ahaMoment: "Every folder has a SKILL.md"
features:
  - "TypeScript strict mode"
  - "Built-in marketing"
targetClients:
  - "indie-hacker"
tags: []
active: true
---

The full-stack TypeScript framework for AI-assisted development.
`;

const INACTIVE_HOOK = `---
id: "old-hook"
title: "Old Hook"
type: hook
format: statement
active: false
tags: []
---

This hook is no longer used.
`;

const INVALID_FRONTMATTER = `---
type: unknown-type
---

Invalid heuristic.
`;

const NO_FRONTMATTER = `
Just plain markdown content without frontmatter.
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("parseFrontmatter", () => {
  it("should parse key-value pairs", () => {
    const result = parseFrontmatter(VALID_HOOK);
    expect(result.data.id).toBe("attention-grabber");
    expect(result.data.title).toBe("The Attention Grabber");
    expect(result.data.type).toBe("hook");
    expect(result.data.format).toBe("question");
    expect(result.data.active).toBe(true);
  });

  it("should parse arrays", () => {
    const result = parseFrontmatter(VALID_HOOK);
    expect(result.data.tags).toEqual(["social", "twitter"]);
  });

  it("should extract body content", () => {
    const result = parseFrontmatter(VALID_HOOK);
    expect(result.body).toContain("Are you still writing code");
  });

  it("should handle missing frontmatter", () => {
    const result = parseFrontmatter(NO_FRONTMATTER);
    expect(result.data).toEqual({});
    expect(result.body).toContain("Just plain markdown");
  });

  it("should parse boolean values", () => {
    const result = parseFrontmatter(INACTIVE_HOOK);
    expect(result.data.active).toBe(false);
  });
});

describe("loadHeuristics", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "heuristics-"));

    // Create directory structure
    await mkdir(join(tempDir, "hooks"), { recursive: true });
    await mkdir(join(tempDir, "clients"), { recursive: true });
    await mkdir(join(tempDir, "products"), { recursive: true });

    // Write test files
    await writeFile(join(tempDir, "hooks", "attention-grabber.md"), VALID_HOOK);
    await writeFile(join(tempDir, "clients", "indie-hacker.md"), VALID_CLIENT);
    await writeFile(
      join(tempDir, "products", "vor-framework.md"),
      VALID_PRODUCT,
    );
    await writeFile(join(tempDir, "hooks", "old-hook.md"), INACTIVE_HOOK);
    await writeFile(join(tempDir, "hooks", "invalid.md"), INVALID_FRONTMATTER);
    await writeFile(join(tempDir, "hooks", "no-fm.md"), NO_FRONTMATTER);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should load all valid heuristics", async () => {
    const heuristics = await loadHeuristics(tempDir);
    // Should load 5 valid files (hook, client, product, inactive hook,
    // and no-fm which infers type "hook" from directory + defaults)
    // Only the invalid type file is skipped
    expect(heuristics.length).toBe(5);
  });

  it("should include file paths", async () => {
    const heuristics = await loadHeuristics(tempDir);
    const hookPaths = heuristics.map((h) => h.filePath);
    expect(hookPaths).toContain("hooks/attention-grabber.md");
    expect(hookPaths).toContain("clients/indie-hacker.md");
  });

  it("should validate frontmatter against type schemas", async () => {
    const heuristics = await loadHeuristics(tempDir);
    const client = heuristics.find((h) => h.frontmatter.id === "indie-hacker");
    expect(client).toBeDefined();
    expect(client!.frontmatter.type).toBe("client");
  });

  it("should skip files with invalid frontmatter", async () => {
    const heuristics = await loadHeuristics(tempDir);
    const invalid = heuristics.find((h) => h.frontmatter.id === "invalid");
    expect(invalid).toBeUndefined();
  });

  it("should handle non-existent directory", async () => {
    const heuristics = await loadHeuristics("/nonexistent/path");
    expect(heuristics).toEqual([]);
  });
});

describe("loadHeuristicsByType", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "heuristics-type-"));
    await mkdir(join(tempDir, "hooks"), { recursive: true });
    await mkdir(join(tempDir, "clients"), { recursive: true });

    await writeFile(join(tempDir, "hooks", "attention-grabber.md"), VALID_HOOK);
    await writeFile(join(tempDir, "hooks", "old-hook.md"), INACTIVE_HOOK);
    await writeFile(join(tempDir, "clients", "indie-hacker.md"), VALID_CLIENT);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should filter by type", async () => {
    const hooks = await loadHeuristicsByType(tempDir, "hook");
    expect(hooks.length).toBe(2);
    expect(hooks.every((h) => h.frontmatter.type === "hook")).toBe(true);
  });

  it("should return empty for non-existent type", async () => {
    const stories = await loadHeuristicsByType(tempDir, "story");
    expect(stories).toEqual([]);
  });
});

describe("loadHeuristicById", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "heuristics-id-"));
    await mkdir(join(tempDir, "hooks"), { recursive: true });
    await writeFile(join(tempDir, "hooks", "attention-grabber.md"), VALID_HOOK);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should find heuristic by ID", async () => {
    const heuristic = await loadHeuristicById(tempDir, "attention-grabber");
    expect(heuristic).not.toBeNull();
    expect(heuristic!.frontmatter.id).toBe("attention-grabber");
  });

  it("should return null for non-existent ID", async () => {
    const heuristic = await loadHeuristicById(tempDir, "non-existent");
    expect(heuristic).toBeNull();
  });

  it("should filter by type when provided", async () => {
    const heuristic = await loadHeuristicById(
      tempDir,
      "attention-grabber",
      "hook",
    );
    expect(heuristic).not.toBeNull();

    const wrong = await loadHeuristicById(
      tempDir,
      "attention-grabber",
      "client",
    );
    expect(wrong).toBeNull();
  });
});

describe("loadActiveHeuristics", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "heuristics-active-"));
    await mkdir(join(tempDir, "hooks"), { recursive: true });
    await writeFile(join(tempDir, "hooks", "attention-grabber.md"), VALID_HOOK);
    await writeFile(join(tempDir, "hooks", "old-hook.md"), INACTIVE_HOOK);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should only return active heuristics", async () => {
    const active = await loadActiveHeuristics(tempDir);
    expect(active.length).toBe(1);
    expect(active[0]!.frontmatter.id).toBe("attention-grabber");
  });
});

describe("loadHeuristicsByTag", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "heuristics-tag-"));
    await mkdir(join(tempDir, "hooks"), { recursive: true });
    await mkdir(join(tempDir, "clients"), { recursive: true });
    await writeFile(join(tempDir, "hooks", "attention-grabber.md"), VALID_HOOK);
    await writeFile(join(tempDir, "clients", "indie-hacker.md"), VALID_CLIENT);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should filter by tag", async () => {
    const social = await loadHeuristicsByTag(tempDir, "social");
    expect(social.length).toBe(1);
    expect(social[0]!.frontmatter.id).toBe("attention-grabber");
  });

  it("should return empty for non-existent tag", async () => {
    const result = await loadHeuristicsByTag(tempDir, "nonexistent");
    expect(result).toEqual([]);
  });
});

describe("loadHeuristicFile", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "heuristic-file-"));
    await mkdir(join(tempDir, "hooks"), { recursive: true });
    await writeFile(join(tempDir, "hooks", "attention-grabber.md"), VALID_HOOK);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should load a single file with correct structure", async () => {
    const result = await loadHeuristicFile(
      join(tempDir, "hooks", "attention-grabber.md"),
      tempDir,
    );

    expect(result).not.toBeNull();
    expect(result!.frontmatter.id).toBe("attention-grabber");
    expect(result!.body).toContain("Are you still writing code");
    expect(result!.filePath).toBe("hooks/attention-grabber.md");
  });

  it("should return null for non-existent file", async () => {
    const result = await loadHeuristicFile("/nonexistent/file.md", tempDir);
    expect(result).toBeNull();
  });
});
