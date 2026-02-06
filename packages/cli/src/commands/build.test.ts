/**
 * `vibe build` — Tests
 *
 * Tests for parallel execution, incremental detection, and timing report.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import {
  runBuildStep,
  detectChangedContent,
  formatBuildTiming,
  type BuildTiming,
} from "./build.js";

describe("runBuildStep", () => {
  it("should track successful step timing", async () => {
    const result = await runBuildStep("test", async () => {
      // Do nothing - success
    });

    expect(result.name).toBe("test");
    expect(result.success).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("should track failed step", async () => {
    const result = await runBuildStep("failing", async () => {
      throw new Error("Build failed");
    });

    expect(result.success).toBe(false);
    expect(result.output).toContain("Build failed");
  });
});

describe("detectChangedContent", () => {
  const testDir = join(tmpdir(), "vibe-build-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should return empty when no content directory", () => {
    const changed = detectChangedContent(testDir);
    expect(changed).toEqual([]);
  });

  it("should detect markdown files", () => {
    const contentDir = join(testDir, "content", "blog");
    mkdirSync(contentDir, { recursive: true });
    writeFileSync(join(contentDir, "post.md"), "# Hello");

    const changed = detectChangedContent(testDir);
    expect(changed.length).toBeGreaterThan(0);
    expect(changed.some((f) => f.endsWith("post.md"))).toBe(true);
  });

  it("should detect MDX files", () => {
    const contentDir = join(testDir, "content", "docs");
    mkdirSync(contentDir, { recursive: true });
    writeFileSync(join(contentDir, "guide.mdx"), "# Guide");

    const changed = detectChangedContent(testDir);
    expect(changed.some((f) => f.endsWith("guide.mdx"))).toBe(true);
  });

  it("should filter by last build time", () => {
    const contentDir = join(testDir, "content", "blog");
    mkdirSync(contentDir, { recursive: true });
    writeFileSync(join(contentDir, "old-post.md"), "# Old");

    // Use future time to make all files "old"
    const futureTime = Date.now() + 10000;
    const changed = detectChangedContent(testDir, futureTime);
    expect(changed).toEqual([]);
  });
});

describe("formatBuildTiming", () => {
  it("should format timing with green total under 30s", () => {
    const timing: BuildTiming = {
      total: 15000,
      typecheck: 5000,
      compilation: 8000,
      sites: 1000,
      imageOptimization: 1000,
    };

    const output = formatBuildTiming(timing);
    expect(output).toContain("Build timing");
    expect(output).toContain("5000ms");
    expect(output).toContain("8000ms");
    expect(output).toContain("15000ms");
  });

  it("should format timing with yellow total over 30s", () => {
    const timing: BuildTiming = {
      total: 45000,
      typecheck: 15000,
      compilation: 20000,
      sites: 5000,
      imageOptimization: 5000,
    };

    const output = formatBuildTiming(timing);
    expect(output).toContain("45000ms");
  });
});
