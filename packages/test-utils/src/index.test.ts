/**
 * Test Utils — Self Tests
 *
 * Tests for the test utilities themselves.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import {
  FixtureStore,
  createTempContent,
  createMarkdownFile,
  cleanupTempContent,
  mockUser,
  mockPost,
  mockContact,
  resetMockCounters,
  assertFileExists,
  assertFileNotExists,
  assertFileContains,
} from "./index.js";

describe("FixtureStore", () => {
  const testDir = join(tmpdir(), "vibe-fixture-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should record and replay fixtures", () => {
    const store = new FixtureStore(testDir);

    store.record("GET", "https://api.example.com/users", {
      status: 200,
      headers: { "content-type": "application/json" },
      body: [{ id: 1, name: "Test" }],
    });

    const fixture = store.replay("GET", "https://api.example.com/users");
    expect(fixture).not.toBeNull();
    expect(fixture!.status).toBe(200);
    expect(fixture!.body).toEqual([{ id: 1, name: "Test" }]);
  });

  it("should return null for unrecorded fixtures", () => {
    const store = new FixtureStore(testDir);
    expect(store.replay("GET", "https://missing.com")).toBeNull();
  });

  it("should check fixture existence", () => {
    const store = new FixtureStore(testDir);

    store.record("POST", "https://api.example.com/data", {
      status: 201,
      headers: {},
      body: { success: true },
    });

    expect(store.has("POST", "https://api.example.com/data")).toBe(true);
    expect(store.has("GET", "https://api.example.com/data")).toBe(false);
  });
});

describe("Content helpers", () => {
  it("should create temp content with markdown files", () => {
    const dir = createTempContent({
      "blog/post.md": { title: "Hello", content: "# World" },
    });

    expect(existsSync(join(dir, "blog", "post.md"))).toBe(true);
    cleanupTempContent(dir);
  });

  it("should create markdown file with frontmatter", () => {
    const dir = join(tmpdir(), "vibe-md-test-" + Date.now());
    mkdirSync(dir, { recursive: true });

    const path = createMarkdownFile(dir, "test.md", "# Hello", {
      title: "Test",
    });
    expect(existsSync(path)).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("Mock factories", () => {
  beforeEach(() => {
    resetMockCounters();
  });

  it("should create mock users with incrementing IDs", () => {
    const user1 = mockUser();
    const user2 = mockUser();
    expect(user1.id).not.toBe(user2.id);
    expect(user1.email).not.toBe(user2.email);
  });

  it("should accept overrides", () => {
    const user = mockUser({ email: "custom@example.com", role: "admin" });
    expect(user.email).toBe("custom@example.com");
    expect(user.role).toBe("admin");
  });

  it("should create mock posts", () => {
    const post = mockPost({ title: "Custom Title" });
    expect(post.title).toBe("Custom Title");
    expect(post.published).toBe(false);
  });

  it("should create mock contacts", () => {
    const contact = mockContact({ stage: "qualified" });
    expect(contact.stage).toBe("qualified");
  });
});

describe("Assertions", () => {
  const testDir = join(tmpdir(), "vibe-assert-test-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("assertFileExists should pass for existing file", () => {
    const file = join(testDir, "exists.txt");
    writeFileSync(file, "hello");
    expect(() => assertFileExists(file)).not.toThrow();
  });

  it("assertFileExists should throw for missing file", () => {
    expect(() => assertFileExists(join(testDir, "missing.txt"))).toThrow();
  });

  it("assertFileNotExists should pass for missing file", () => {
    expect(() =>
      assertFileNotExists(join(testDir, "missing.txt")),
    ).not.toThrow();
  });

  it("assertFileContains should check content", () => {
    const file = join(testDir, "content.txt");
    writeFileSync(file, "hello world");
    expect(() => assertFileContains(file, "hello")).not.toThrow();
    expect(() => assertFileContains(file, "missing")).toThrow();
  });
});
