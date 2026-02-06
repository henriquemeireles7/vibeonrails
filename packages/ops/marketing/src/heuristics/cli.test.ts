/**
 * Heuristics — CLI Tests
 *
 * Tests list by type, create from template, validation errors.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { listHeuristics, createHeuristic, formatHeuristicList } from "./cli.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const HOOK_FILE = `---
id: "test-hook"
title: "Test Hook"
type: hook
format: question
tags:
  - "social"
active: true
---

Test hook content.
`;

const CLIENT_FILE = `---
id: "test-client"
title: "Test Client"
type: client
segment: "Developers"
desires:
  - "Ship faster"
problems:
  - "Too complex"
painBudget: high
tags:
  - "primary"
active: true
---

Test client content.
`;

const INACTIVE_FILE = `---
id: "old-hook"
title: "Old Hook"
type: hook
format: statement
tags: []
active: false
---

Inactive hook.
`;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("listHeuristics", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "cli-list-"));
    await mkdir(join(tempDir, "hooks"), { recursive: true });
    await mkdir(join(tempDir, "clients"), { recursive: true });
    await writeFile(join(tempDir, "hooks", "test-hook.md"), HOOK_FILE);
    await writeFile(join(tempDir, "hooks", "old-hook.md"), INACTIVE_FILE);
    await writeFile(join(tempDir, "clients", "test-client.md"), CLIENT_FILE);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should list all heuristics", async () => {
    const result = await listHeuristics(tempDir);
    expect(result.length).toBe(3);
  });

  it("should filter by type", async () => {
    const hooks = await listHeuristics(tempDir, { type: "hook" });
    expect(hooks.length).toBe(2);
    expect(hooks.every((h) => h.type === "hook")).toBe(true);
  });

  it("should filter active only", async () => {
    const active = await listHeuristics(tempDir, { activeOnly: true });
    expect(active.length).toBe(2);
    expect(active.every((h) => h.active)).toBe(true);
  });

  it("should filter by tag", async () => {
    const social = await listHeuristics(tempDir, { tag: "social" });
    expect(social.length).toBe(1);
    expect(social[0]!.id).toBe("test-hook");
  });

  it("should combine filters", async () => {
    const result = await listHeuristics(tempDir, {
      type: "hook",
      activeOnly: true,
    });
    expect(result.length).toBe(1);
    expect(result[0]!.id).toBe("test-hook");
  });
});

describe("createHeuristic", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "cli-create-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should create a hook heuristic file", async () => {
    const result = await createHeuristic({
      type: "hook",
      name: "My Great Hook",
      heuristicsDir: tempDir,
    });

    expect(result.id).toBe("my-great-hook");
    expect(result.type).toBe("hook");
    expect(result.filePath).toContain("hooks/my-great-hook.md");

    const content = await readFile(result.filePath, "utf-8");
    expect(content).toContain('id: "my-great-hook"');
    expect(content).toContain('title: "My Great Hook"');
    expect(content).toContain("type: hook");
  });

  it("should create a client heuristic file", async () => {
    const result = await createHeuristic({
      type: "client",
      name: "Solo Founder",
      heuristicsDir: tempDir,
    });

    expect(result.type).toBe("client");
    const content = await readFile(result.filePath, "utf-8");
    expect(content).toContain("type: client");
    expect(content).toContain("segment:");
    expect(content).toContain("desires:");
    expect(content).toContain("problems:");
  });

  it("should create directory structure", async () => {
    await createHeuristic({
      type: "concept",
      name: "Big Idea",
      heuristicsDir: tempDir,
    });

    const content = await readFile(
      join(tempDir, "concepts", "big-idea.md"),
      "utf-8",
    );
    expect(content).toContain("type: concept");
    expect(content).toContain("thesis:");
  });

  it("should throw for invalid type", async () => {
    await expect(
      createHeuristic({
        type: "invalid" as HeuristicType,
        name: "test",
        heuristicsDir: tempDir,
      }),
    ).rejects.toThrow("Invalid heuristic type");
  });

  it("should kebab-case the name for ID and filename", async () => {
    const result = await createHeuristic({
      type: "story",
      name: "My Amazing Story!",
      heuristicsDir: tempDir,
    });

    expect(result.id).toBe("my-amazing-story");
    expect(result.filePath).toContain("my-amazing-story.md");
  });
});

describe("formatHeuristicList", () => {
  it("should format empty list", () => {
    const output = formatHeuristicList([]);
    expect(output).toBe("No heuristics found.");
  });

  it("should group by type", () => {
    const output = formatHeuristicList([
      {
        id: "h1",
        title: "Hook 1",
        type: "hook",
        active: true,
        tags: [],
        filePath: "hooks/h1.md",
      },
      {
        id: "h2",
        title: "Hook 2",
        type: "hook",
        active: true,
        tags: ["social"],
        filePath: "hooks/h2.md",
      },
      {
        id: "c1",
        title: "Client 1",
        type: "client",
        active: true,
        tags: [],
        filePath: "clients/c1.md",
      },
    ]);

    expect(output).toContain("HOOK (2)");
    expect(output).toContain("CLIENT (1)");
    expect(output).toContain("[social]");
    expect(output).toContain("Total: 3");
  });

  it("should show inactive status", () => {
    const output = formatHeuristicList([
      {
        id: "h1",
        title: "Hook 1",
        type: "hook",
        active: false,
        tags: [],
        filePath: "hooks/h1.md",
      },
    ]);

    expect(output).toContain("- h1");
  });
});

// Type import for test
import type { HeuristicType } from "./types.js";
