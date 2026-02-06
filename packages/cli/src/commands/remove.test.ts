/**
 * `vibe remove` Command — Tests
 *
 * Tests for clean module removal.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  mkdirSync,
  rmSync,
  existsSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { removeModuleFiles } from "./remove.js";
import { saveManifest, computeChecksum, createFileWithDirs } from "./add.js";

describe("removeModuleFiles", () => {
  const testDir = join(tmpdir(), "vibe-remove-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should return empty result when module not installed", () => {
    const result = removeModuleFiles("nonexistent", testDir);
    expect(result.removed).toEqual([]);
    expect(result.modified).toEqual([]);
    expect(result.missing).toEqual([]);
  });

  it("should remove unmodified files", () => {
    const content = "original content";
    const filePath = "test/file.md";
    const fullPath = join(testDir, filePath);

    // Create file
    createFileWithDirs(fullPath, content);

    // Create manifest
    saveManifest(testDir, {
      version: "1.0",
      modules: {
        "test-module": {
          name: "test-module",
          package: "@vibeonrails/test",
          installedAt: "2026-01-01T00:00:00.000Z",
          files: [
            {
              path: filePath,
              checksum: computeChecksum(content),
            },
          ],
        },
      },
    });

    const result = removeModuleFiles("test-module", testDir);
    expect(result.removed).toContain(filePath);
    expect(existsSync(fullPath)).toBe(false);
  });

  it("should warn about modified files", () => {
    const originalContent = "original";
    const filePath = "test/file.md";
    const fullPath = join(testDir, filePath);

    // Create file with modified content
    createFileWithDirs(fullPath, "modified content");

    // Create manifest with original checksum
    saveManifest(testDir, {
      version: "1.0",
      modules: {
        "test-module": {
          name: "test-module",
          package: "@vibeonrails/test",
          installedAt: "2026-01-01T00:00:00.000Z",
          files: [
            {
              path: filePath,
              checksum: computeChecksum(originalContent),
            },
          ],
        },
      },
    });

    const result = removeModuleFiles("test-module", testDir);
    expect(result.modified).toContain(filePath);
    // File should still exist
    expect(existsSync(fullPath)).toBe(true);
  });

  it("should handle missing files gracefully", () => {
    saveManifest(testDir, {
      version: "1.0",
      modules: {
        "test-module": {
          name: "test-module",
          package: "@vibeonrails/test",
          installedAt: "2026-01-01T00:00:00.000Z",
          files: [
            {
              path: "nonexistent/file.md",
              checksum: "abc123",
            },
          ],
        },
      },
    });

    const result = removeModuleFiles("test-module", testDir);
    expect(result.missing).toContain("nonexistent/file.md");
  });

  it("should remove empty parent directories", () => {
    const content = "content";
    const filePath = "deep/nested/dir/file.md";
    const fullPath = join(testDir, filePath);

    createFileWithDirs(fullPath, content);

    saveManifest(testDir, {
      version: "1.0",
      modules: {
        "test-module": {
          name: "test-module",
          package: "@vibeonrails/test",
          installedAt: "2026-01-01T00:00:00.000Z",
          files: [
            {
              path: filePath,
              checksum: computeChecksum(content),
            },
          ],
        },
      },
    });

    const result = removeModuleFiles("test-module", testDir);
    expect(result.removed).toContain(filePath);
    // Empty parent dirs should be cleaned up
    expect(existsSync(join(testDir, "deep", "nested", "dir"))).toBe(false);
  });
});
