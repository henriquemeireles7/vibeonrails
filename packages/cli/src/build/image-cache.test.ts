/**
 * Image Optimization Cache — Tests
 *
 * Tests for cache hit/miss, content hash, srcset generation, and cache stats.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import {
  ImageCache,
  isSupportedImage,
  SUPPORTED_FORMATS,
  RESPONSIVE_WIDTHS,
} from "./image-cache.js";

describe("ImageCache", () => {
  const testDir = join(tmpdir(), "vibe-image-cache-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should create an instance", () => {
    const cache = new ImageCache(testDir);
    expect(cache).toBeDefined();
  });

  it("should compute content hash", () => {
    const testFile = join(testDir, "test.txt");
    writeFileSync(testFile, "hello world");

    const cache = new ImageCache(testDir);
    const hash = cache.computeHash(testFile);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("should return consistent hash for same content", () => {
    const file1 = join(testDir, "file1.txt");
    const file2 = join(testDir, "file2.txt");
    writeFileSync(file1, "same content");
    writeFileSync(file2, "same content");

    const cache = new ImageCache(testDir);
    expect(cache.computeHash(file1)).toBe(cache.computeHash(file2));
  });

  it("should return different hash for different content", () => {
    const file1 = join(testDir, "file1.txt");
    const file2 = join(testDir, "file2.txt");
    writeFileSync(file1, "content A");
    writeFileSync(file2, "content B");

    const cache = new ImageCache(testDir);
    expect(cache.computeHash(file1)).not.toBe(cache.computeHash(file2));
  });

  it("should report cache miss for unknown entry", () => {
    const cache = new ImageCache(testDir);
    expect(cache.has("unknown-hash", 640, "webp")).toBe(false);
  });

  it("should store and retrieve cached image", () => {
    const cache = new ImageCache(testDir);
    const data = Buffer.from("fake image data");

    const path = cache.set("/source.jpg", "test-hash", 640, "webp", data);
    expect(existsSync(path)).toBe(true);
    expect(cache.has("test-hash", 640, "webp")).toBe(true);
  });

  it("should return null for uncached get", () => {
    const cache = new ImageCache(testDir);
    expect(cache.get("missing", 640, "webp")).toBeNull();
  });

  it("should generate srcset from cached entries", () => {
    const cache = new ImageCache(testDir);
    const data = Buffer.from("fake");

    cache.set("/img.jpg", "hash1", 320, "webp", data);
    cache.set("/img.jpg", "hash1", 640, "webp", data);

    const srcset = cache.generateSrcset("hash1", "webp");
    expect(srcset).toContain("320w");
    expect(srcset).toContain("640w");
  });

  it("should report accurate stats", () => {
    const cache = new ImageCache(testDir);
    const data = Buffer.from("test data");

    cache.set("/img.jpg", "hash1", 320, "webp", data);
    cache.has("hash1", 320, "webp"); // hit

    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(1);
    expect(stats.hits).toBe(1);
  });

  it("should format stats as string", () => {
    const cache = new ImageCache(testDir);
    const output = cache.formatStats();
    expect(output).toContain("Image cache");
    expect(output).toContain("entries");
  });
});

describe("isSupportedImage", () => {
  it("should accept supported formats", () => {
    expect(isSupportedImage("photo.jpg")).toBe(true);
    expect(isSupportedImage("photo.jpeg")).toBe(true);
    expect(isSupportedImage("logo.png")).toBe(true);
    expect(isSupportedImage("banner.gif")).toBe(true);
    expect(isSupportedImage("hero.webp")).toBe(true);
  });

  it("should reject unsupported formats", () => {
    expect(isSupportedImage("doc.pdf")).toBe(false);
    expect(isSupportedImage("data.json")).toBe(false);
    expect(isSupportedImage("style.css")).toBe(false);
    expect(isSupportedImage("script.ts")).toBe(false);
  });

  it("should be case-insensitive", () => {
    expect(isSupportedImage("photo.JPG")).toBe(true);
    expect(isSupportedImage("logo.PNG")).toBe(true);
  });
});

describe("SUPPORTED_FORMATS", () => {
  it("should include common image formats", () => {
    expect(SUPPORTED_FORMATS).toContain(".jpg");
    expect(SUPPORTED_FORMATS).toContain(".png");
    expect(SUPPORTED_FORMATS).toContain(".webp");
  });
});

describe("RESPONSIVE_WIDTHS", () => {
  it("should be in ascending order", () => {
    for (let i = 1; i < RESPONSIVE_WIDTHS.length; i++) {
      expect(RESPONSIVE_WIDTHS[i]).toBeGreaterThan(RESPONSIVE_WIDTHS[i - 1]!);
    }
  });

  it("should cover mobile to desktop", () => {
    expect(RESPONSIVE_WIDTHS[0]).toBeLessThanOrEqual(320);
    expect(
      RESPONSIVE_WIDTHS[RESPONSIVE_WIDTHS.length - 1],
    ).toBeGreaterThanOrEqual(1280);
  });
});
