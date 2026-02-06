/**
 * Markdown Parse Cache — Tests
 *
 * Tests for cache hit/miss, AST validity, incremental parsing.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import {
  MarkdownCache,
  parseFrontmatter,
  extractHeadings,
  countWords,
  generateExcerpt,
} from "./markdown-cache.js";

describe("parseFrontmatter", () => {
  it("should parse valid frontmatter", () => {
    const content = `---
title: Hello World
draft: false
order: 3
---

# Content here`;

    const { frontmatter, body } = parseFrontmatter(content);
    expect(frontmatter["title"]).toBe("Hello World");
    expect(frontmatter["draft"]).toBe(false);
    expect(frontmatter["order"]).toBe(3);
    expect(body).toContain("# Content here");
  });

  it("should handle missing frontmatter", () => {
    const { frontmatter, body } = parseFrontmatter("# No frontmatter");
    expect(Object.keys(frontmatter)).toHaveLength(0);
    expect(body).toBe("# No frontmatter");
  });

  it("should parse quoted strings", () => {
    const content = `---
title: "My Title"
---

Body`;

    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter["title"]).toBe("My Title");
  });
});

describe("extractHeadings", () => {
  it("should extract all heading levels", () => {
    const content = `# H1
## H2
### H3
#### H4`;

    const headings = extractHeadings(content);
    expect(headings).toHaveLength(4);
    expect(headings[0]).toEqual({ depth: 1, text: "H1", id: "h1" });
    expect(headings[1]).toEqual({ depth: 2, text: "H2", id: "h2" });
  });

  it("should generate slug IDs", () => {
    const content = "## Hello World & Friends";
    const headings = extractHeadings(content);
    expect(headings[0]!.id).toBe("hello-world-friends");
  });

  it("should return empty for no headings", () => {
    expect(extractHeadings("plain text")).toEqual([]);
  });
});

describe("countWords", () => {
  it("should count words in plain text", () => {
    expect(countWords("hello world")).toBe(2);
  });

  it("should strip markdown formatting", () => {
    expect(countWords("# Hello **World**")).toBe(2);
  });

  it("should handle empty content", () => {
    expect(countWords("")).toBe(0);
  });
});

describe("generateExcerpt", () => {
  it("should return short content as-is", () => {
    expect(generateExcerpt("Short text.")).toBe("Short text.");
  });

  it("should truncate long content", () => {
    const long = "word ".repeat(100);
    const excerpt = generateExcerpt(long, 50);
    expect(excerpt.length).toBeLessThanOrEqual(55); // +3 for "..."
    expect(excerpt).toEndWith("...");
  });

  it("should strip headings", () => {
    const content = "# Title\n\nActual content here.";
    const excerpt = generateExcerpt(content);
    expect(excerpt).not.toContain("#");
    expect(excerpt).toContain("Actual content here.");
  });
});

describe("MarkdownCache", () => {
  const testDir = join(tmpdir(), "vibe-md-cache-" + Date.now());

  beforeEach(() => {
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("should parse a markdown file", () => {
    const mdFile = join(testDir, "test.md");
    writeFileSync(
      mdFile,
      `---
title: Test
---

# Hello

This is content.`,
    );

    const cache = new MarkdownCache(testDir);
    const result = cache.parse(mdFile);

    expect(result.frontmatter["title"]).toBe("Test");
    expect(result.headings).toHaveLength(1);
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.contentHash).toMatch(/^[0-9a-f]{16}$/);
  });

  it("should cache on second parse", () => {
    const mdFile = join(testDir, "cached.md");
    writeFileSync(mdFile, "# Hello");

    const cache = new MarkdownCache(testDir);
    cache.parse(mdFile);
    cache.parse(mdFile);

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it("should re-parse on content change", () => {
    const mdFile = join(testDir, "changing.md");
    writeFileSync(mdFile, "# Version 1");

    const cache = new MarkdownCache(testDir);
    const first = cache.parse(mdFile);

    writeFileSync(mdFile, "# Version 2");
    const second = cache.parse(mdFile);

    expect(first.contentHash).not.toBe(second.contentHash);
    expect(second.headings[0]!.text).toBe("Version 2");
  });

  it("should parse multiple files", async () => {
    const file1 = join(testDir, "a.md");
    const file2 = join(testDir, "b.md");
    writeFileSync(file1, "# File A");
    writeFileSync(file2, "# File B");

    const cache = new MarkdownCache(testDir);
    const results = await cache.parseMany([file1, file2]);

    expect(results).toHaveLength(2);
  });

  it("should report accurate stats", () => {
    const cache = new MarkdownCache(testDir);
    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
  });

  it("should clear the cache", () => {
    const mdFile = join(testDir, "to-clear.md");
    writeFileSync(mdFile, "# Clear me");

    const cache = new MarkdownCache(testDir);
    cache.parse(mdFile);
    cache.clear();

    const stats = cache.getStats();
    expect(stats.totalEntries).toBe(0);
  });
});
