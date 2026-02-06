/**
 * `vibe dev` — Tests
 *
 * Tests for boot sequence, parallel init, and timing measurement.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import {
  measureTime,
  validateEnv,
  buildContentIndex,
  generateSkillMd,
  formatBootTiming,
  type BootTiming,
} from "./dev.js";

describe("measureTime", () => {
  it("should measure execution time", async () => {
    const { result, elapsed } = await measureTime(async () => {
      return 42;
    });

    expect(result).toBe(42);
    expect(elapsed).toBeGreaterThanOrEqual(0);
  });

  it("should measure async operation time", async () => {
    const { elapsed } = await measureTime(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(elapsed).toBeGreaterThanOrEqual(40);
  });
});

describe("validateEnv", () => {
  const testDir = join(tmpdir(), "vibe-dev-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should not throw when .env exists", async () => {
    writeFileSync(join(testDir, ".env"), "PORT=3000");
    await expect(validateEnv(testDir)).resolves.toBeUndefined();
  });

  it("should not throw when no .env files exist", async () => {
    await expect(validateEnv(testDir)).resolves.toBeUndefined();
  });
});

describe("buildContentIndex", () => {
  const testDir = join(tmpdir(), "vibe-content-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should skip when no content directory", async () => {
    await expect(buildContentIndex(testDir)).resolves.toBeUndefined();
  });

  it("should handle content directory", async () => {
    mkdirSync(join(testDir, "content"), { recursive: true });
    await expect(buildContentIndex(testDir)).resolves.toBeUndefined();
  });
});

describe("generateSkillMd", () => {
  const testDir = join(tmpdir(), "vibe-skill-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should skip when no src directory", async () => {
    await expect(generateSkillMd(testDir)).resolves.toBeUndefined();
  });
});

describe("formatBootTiming", () => {
  it("should format timing with green total under 3s", () => {
    const timing: BootTiming = {
      total: 1500,
      envValidation: 10,
      contentIndex: 200,
      skillmdGen: 50,
      serverStart: 1240,
    };

    const output = formatBootTiming(timing);
    expect(output).toContain("Boot timing");
    expect(output).toContain("1500ms");
    expect(output).toContain("10ms");
    expect(output).toContain("200ms");
  });

  it("should format timing with yellow total over 3s", () => {
    const timing: BootTiming = {
      total: 5000,
      envValidation: 500,
      contentIndex: 2000,
      skillmdGen: 500,
      serverStart: 2000,
    };

    const output = formatBootTiming(timing);
    expect(output).toContain("5000ms");
  });
});
