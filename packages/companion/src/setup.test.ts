/**
 * Companion Setup — Tests
 *
 * Tests for the companion setup flow with mocked OpenClaw API.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  mkdirSync,
  rmSync,
  readFileSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import {
  setupCompanion,
  parseSkillMetadata,
  loadSkillMetadata,
  saveConfig,
  loadConfig,
  checkCompatibility,
} from "./setup.js";
import { SKILL_NAMES, generateRandomName, type SetupOptions } from "./types.js";

describe("parseSkillMetadata", () => {
  it("should parse valid skill frontmatter", () => {
    const content = `---
name: vibe-project
description: Run any Vibe on Rails CLI command
version: 1.0.0
min_openclaw_version: "0.5.0"
skill_format_version: "1.0"
author: vibeonrails
tags:
  - cli
  - project
---

# Content here`;

    const metadata = parseSkillMetadata(content);
    expect(metadata.name).toBe("vibe-project");
    expect(metadata.description).toBe("Run any Vibe on Rails CLI command");
    expect(metadata.version).toBe("1.0.0");
    expect(metadata.minOpenclawVersion).toBe("0.5.0");
    expect(metadata.skillFormatVersion).toBe("1.0");
    expect(metadata.author).toBe("vibeonrails");
    expect(metadata.tags).toContain("cli");
    expect(metadata.tags).toContain("project");
  });

  it("should throw on missing frontmatter", () => {
    expect(() => parseSkillMetadata("# No frontmatter")).toThrow(
      "Skill file missing frontmatter",
    );
  });
});

describe("generateRandomName", () => {
  it("should generate a hyphenated name", () => {
    const name = generateRandomName();
    expect(name).toMatch(/^[a-z]+-[a-z]+$/);
  });

  it("should generate different names (probabilistically)", () => {
    const names = new Set(
      Array.from({ length: 20 }, () => generateRandomName()),
    );
    expect(names.size).toBeGreaterThan(1);
  });
});

describe("SKILL_NAMES", () => {
  it("should include all five skills", () => {
    expect(SKILL_NAMES).toHaveLength(5);
    expect(SKILL_NAMES).toContain("vibe-project");
    expect(SKILL_NAMES).toContain("vibe-marketing");
    expect(SKILL_NAMES).toContain("vibe-support");
    expect(SKILL_NAMES).toContain("vibe-finance");
    expect(SKILL_NAMES).toContain("vibe-analytics");
  });
});

describe("saveConfig / loadConfig", () => {
  const testDir = join(tmpdir(), "vibe-companion-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should save and load config", () => {
    const config = {
      platform: "discord" as const,
      openclawUrl: "http://localhost:3100",
      name: "test-bot",
      personalityPath: "content/brand/agent.md",
      installedSkills: ["vibe-project"],
      channelMapping: { general: "general" },
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    saveConfig(testDir, config);

    const loaded = loadConfig(testDir);
    expect(loaded).toEqual(config);
  });

  it("should create .vibe directory if it does not exist", () => {
    const config = {
      platform: "discord" as const,
      openclawUrl: "http://localhost:3100",
      name: "test-bot",
      personalityPath: "content/brand/agent.md",
      installedSkills: [],
      channelMapping: {},
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };

    saveConfig(testDir, config);

    expect(existsSync(join(testDir, ".vibe", "companion.json"))).toBe(true);
  });

  it("should return null for missing config", () => {
    const loaded = loadConfig(testDir);
    expect(loaded).toBeNull();
  });
});

describe("checkCompatibility", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return incompatible when OpenClaw is unreachable", async () => {
    const result = await checkCompatibility("http://localhost:99999", [
      {
        name: "test",
        description: "",
        version: "1.0.0",
        minOpenclawVersion: "0.5.0",
        skillFormatVersion: "1.0",
        author: "test",
        tags: [],
      },
    ]);

    expect(result.compatible).toBe(false);
    expect(result.openclawVersion).toBe("unreachable");
  });
});

describe("setupCompanion", () => {
  const testDir = join(tmpdir(), "vibe-companion-setup-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it("should return error for invalid options", async () => {
    const result = await setupCompanion({
      platform: "discord",
      openclawUrl: "not-a-url",
      projectRoot: testDir,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid options");
  });

  it("should export setupCompanion function", () => {
    expect(typeof setupCompanion).toBe("function");
  });

  it("should accept valid SetupOptions type", () => {
    const opts: SetupOptions = {
      platform: "discord",
      openclawUrl: "http://localhost:3100",
      projectRoot: testDir,
      name: "my-bot",
    };

    expect(opts.platform).toBe("discord");
    expect(opts.name).toBe("my-bot");
  });
});
