import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { existsSync, mkdirSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { ensureDir, replaceInFile, copyDir } from "./fs.js";

describe("fs utilities", () => {
  const testDir = join(tmpdir(), "vibe-cli-fs-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("ensureDir", () => {
    it("creates a directory if it does not exist", () => {
      const dir = join(testDir, "new-dir");
      ensureDir(dir);
      expect(existsSync(dir)).toBe(true);
    });

    it("does not throw if directory already exists", () => {
      const dir = join(testDir, "existing-dir");
      mkdirSync(dir, { recursive: true });
      expect(() => ensureDir(dir)).not.toThrow();
    });

    it("creates nested directories", () => {
      const dir = join(testDir, "a", "b", "c");
      ensureDir(dir);
      expect(existsSync(dir)).toBe(true);
    });
  });

  describe("replaceInFile", () => {
    it("replaces all occurrences of a placeholder in a file", () => {
      const filePath = join(testDir, "test.txt");
      writeFileSync(filePath, "Hello __NAME__! Welcome __NAME__.");
      replaceInFile(filePath, "__NAME__", "Alice");
      expect(readFileSync(filePath, "utf-8")).toBe(
        "Hello Alice! Welcome Alice.",
      );
    });

    it("handles files with no matches gracefully", () => {
      const filePath = join(testDir, "test.txt");
      writeFileSync(filePath, "Hello World!");
      replaceInFile(filePath, "__NAME__", "Alice");
      expect(readFileSync(filePath, "utf-8")).toBe("Hello World!");
    });
  });

  describe("copyDir", () => {
    it("copies a directory recursively", () => {
      const src = join(testDir, "src-dir");
      const dest = join(testDir, "dest-dir");

      mkdirSync(join(src, "sub"), { recursive: true });
      writeFileSync(join(src, "file.txt"), "root file");
      writeFileSync(join(src, "sub", "nested.txt"), "nested file");

      copyDir(src, dest);

      expect(readFileSync(join(dest, "file.txt"), "utf-8")).toBe("root file");
      expect(readFileSync(join(dest, "sub", "nested.txt"), "utf-8")).toBe(
        "nested file",
      );
    });

    it("overwrites existing files in destination", () => {
      const src = join(testDir, "src2");
      const dest = join(testDir, "dest2");

      mkdirSync(src, { recursive: true });
      mkdirSync(dest, { recursive: true });

      writeFileSync(join(src, "file.txt"), "new content");
      writeFileSync(join(dest, "file.txt"), "old content");

      copyDir(src, dest);

      expect(readFileSync(join(dest, "file.txt"), "utf-8")).toBe("new content");
    });
  });
});
