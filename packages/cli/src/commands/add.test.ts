/**
 * `vibe add` Command — Tests
 *
 * Tests for the smart module installer.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, rmSync, existsSync, readFileSync } from "node:fs";
import {
  computeChecksum,
  loadManifest,
  saveManifest,
  installModuleFiles,
  createFileWithDirs,
} from "./add.js";

describe("computeChecksum", () => {
  it("should return consistent hash for same content", () => {
    const hash1 = computeChecksum("hello world");
    const hash2 = computeChecksum("hello world");
    expect(hash1).toBe(hash2);
  });

  it("should return different hash for different content", () => {
    const hash1 = computeChecksum("hello");
    const hash2 = computeChecksum("world");
    expect(hash1).not.toBe(hash2);
  });

  it("should return a 64-char hex string (SHA-256)", () => {
    const hash = computeChecksum("test");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("loadManifest / saveManifest", () => {
  const testDir = join(tmpdir(), "vibe-add-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should return default manifest when none exists", () => {
    const manifest = loadManifest(testDir);
    expect(manifest.version).toBe("1.0");
    expect(Object.keys(manifest.modules)).toHaveLength(0);
  });

  it("should save and load manifest", () => {
    const manifest = {
      version: "1.0",
      modules: {
        marketing: {
          name: "marketing",
          package: "@vibeonrails/marketing",
          installedAt: "2026-01-01T00:00:00.000Z",
          files: [{ path: "test.txt", checksum: "abc123" }],
        },
      },
    };

    saveManifest(testDir, manifest);
    const loaded = loadManifest(testDir);
    expect(loaded).toEqual(manifest);
  });

  it("should create .vibe directory", () => {
    saveManifest(testDir, { version: "1.0", modules: {} });
    expect(existsSync(join(testDir, ".vibe", "modules.json"))).toBe(true);
  });
});

describe("createFileWithDirs", () => {
  const testDir = join(tmpdir(), "vibe-add-files-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should create file with nested directories", () => {
    const filePath = join(testDir, "a", "b", "c", "test.md");
    createFileWithDirs(filePath, "content");
    expect(existsSync(filePath)).toBe(true);
    expect(readFileSync(filePath, "utf-8")).toBe("content");
  });
});

describe("installModuleFiles", () => {
  const testDir = join(tmpdir(), "vibe-install-files-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should install marketing module files", () => {
    const installed = installModuleFiles("marketing", testDir);
    expect(installed.length).toBeGreaterThan(0);

    // Verify files were created
    for (const file of installed) {
      expect(existsSync(join(testDir, file.path))).toBe(true);
    }
  });

  it("should create content directories", () => {
    installModuleFiles("marketing", testDir);
    expect(existsSync(join(testDir, "content", "marketing"))).toBe(true);
  });

  it("should not overwrite existing files", () => {
    // Create a file first
    const filePath = join(
      testDir,
      "content",
      "marketing",
      "transform",
      "prompts",
      "twitter.md",
    );
    mkdirSync(join(testDir, "content", "marketing", "transform", "prompts"), {
      recursive: true,
    });
    const originalContent = "custom content";
    createFileWithDirs(filePath, originalContent);

    // Install module
    installModuleFiles("marketing", testDir);

    // Verify file was not overwritten
    expect(readFileSync(filePath, "utf-8")).toBe(originalContent);
  });

  it("should return empty for unknown module", () => {
    const installed = installModuleFiles("nonexistent", testDir);
    expect(installed).toEqual([]);
  });

  it("should include checksum for each file", () => {
    const installed = installModuleFiles("marketing", testDir);
    for (const file of installed) {
      expect(file.checksum).toMatch(/^[0-9a-f]{64}$/);
    }
  });
});
