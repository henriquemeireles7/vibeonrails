import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mkdtemp,
  rm,
  mkdir,
  writeFile,
  readFile,
  stat,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  buildIndex,
  updateIndex,
  writeIndex,
  indexContent,
} from "./indexer.js";
import type { IndexConfig, ContentIndex } from "./types.js";

let tempDir: string;
let contentDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), "vor-content-index-test-"));
  contentDir = join(tempDir, "content");
  await mkdir(contentDir, { recursive: true });
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("Content Indexer", () => {
  describe("buildIndex", () => {
    it("should build index from markdown files", async () => {
      await writeFile(
        join(contentDir, "post1.md"),
        `---
title: First Post
type: blog
tags:
  - tech
  - news
date: 2024-01-01
description: My first post
---
# First Post

This is the content of the first post.
`,
      );

      await writeFile(
        join(contentDir, "post2.md"),
        `---
title: Second Post
type: blog
---
# Second Post

This is another post.
`,
      );

      const config: IndexConfig = {
        contentRoot: contentDir,
      };

      const index = await buildIndex(config);

      expect(index.entries).toHaveProperty("post1.md");
      expect(index.entries).toHaveProperty("post2.md");
      expect(index.entries["post1.md"].title).toBe("First Post");
      expect(index.entries["post1.md"].type).toBe("blog");
      expect(index.entries["post1.md"].tags).toEqual(["tech", "news"]);
      expect(index.entries["post1.md"].date).toBe("2024-01-01");
      expect(index.entries["post1.md"].description).toBe("My first post");
      expect(index.entries["post2.md"].title).toBe("Second Post");
      expect(index.generatedAt).toBeTruthy();
      expect(index.contentRoot).toBe(contentDir);
    });

    it("should handle files without frontmatter", async () => {
      await writeFile(
        join(contentDir, "simple.md"),
        "# Simple Post\n\nNo frontmatter here.",
      );

      const config: IndexConfig = {
        contentRoot: contentDir,
      };

      const index = await buildIndex(config);

      expect(index.entries).toHaveProperty("simple.md");
      expect(index.entries["simple.md"].title).toBe("simple");
      expect(index.entries["simple.md"].type).toBe("page");
      expect(index.entries["simple.md"].tags).toEqual([]);
    });

    it("should scan nested directories", async () => {
      const blogDir = join(contentDir, "blog");
      await mkdir(blogDir, { recursive: true });

      await writeFile(
        join(blogDir, "nested.md"),
        `---
title: Nested Post
---
# Nested`,
      );

      const config: IndexConfig = {
        contentRoot: contentDir,
      };

      const index = await buildIndex(config);

      expect(index.entries).toHaveProperty("blog/nested.md");
      expect(index.entries["blog/nested.md"].title).toBe("Nested Post");
    });

    it("should extract content snippet", async () => {
      const longContent = "A".repeat(300);
      await writeFile(
        join(contentDir, "long.md"),
        `---
title: Long Post
---
${longContent}`,
      );

      const config: IndexConfig = {
        contentRoot: contentDir,
      };

      const index = await buildIndex(config);

      expect(
        index.entries["long.md"].contentSnippet.length,
      ).toBeLessThanOrEqual(200);
      expect(index.entries["long.md"].contentSnippet).toBeTruthy();
    });

    it("should ignore non-markdown files", async () => {
      await writeFile(join(contentDir, "file.txt"), "Not markdown");
      await writeFile(join(contentDir, "post.md"), "# Post");

      const config: IndexConfig = {
        contentRoot: contentDir,
      };

      const index = await buildIndex(config);

      expect(index.entries).toHaveProperty("post.md");
      expect(index.entries).not.toHaveProperty("file.txt");
    });
  });

  describe("updateIndex", () => {
    it("should update index incrementally", async () => {
      const outputPath = join(tempDir, ".vibe", "content-index.json");

      // Create initial file
      await writeFile(
        join(contentDir, "post1.md"),
        `---
title: First Post
---
# First`,
      );

      const config: IndexConfig = {
        contentRoot: contentDir,
        outputPath,
        incremental: true,
      };

      // Build initial index
      const initialIndex = await buildIndex(config);
      await writeIndex(initialIndex, outputPath);

      // Add new file
      await writeFile(
        join(contentDir, "post2.md"),
        `---
title: Second Post
---
# Second`,
      );

      // Update index
      const updatedIndex = await updateIndex(config);

      expect(updatedIndex.entries).toHaveProperty("post1.md");
      expect(updatedIndex.entries).toHaveProperty("post2.md");
    });

    it("should detect modified files", async () => {
      const outputPath = join(tempDir, ".vibe", "content-index.json");
      const filePath = join(contentDir, "post.md");

      await writeFile(
        filePath,
        `---
title: Original
---
# Original`,
      );

      const config: IndexConfig = {
        contentRoot: contentDir,
        outputPath,
        incremental: true,
      };

      const initialIndex = await buildIndex(config);
      await writeIndex(initialIndex, outputPath);

      // Wait a bit to ensure mtime changes
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Modify file
      await writeFile(
        filePath,
        `---
title: Updated
---
# Updated`,
      );

      const updatedIndex = await updateIndex(config);

      expect(updatedIndex.entries["post.md"].title).toBe("Updated");
    });

    it("should remove deleted files from index", async () => {
      const outputPath = join(tempDir, ".vibe", "content-index.json");

      await writeFile(
        join(contentDir, "post1.md"),
        `---
title: First
---
# First`,
      );

      await writeFile(
        join(contentDir, "post2.md"),
        `---
title: Second
---
# Second`,
      );

      const config: IndexConfig = {
        contentRoot: contentDir,
        outputPath,
        incremental: true,
      };

      const initialIndex = await buildIndex(config);
      await writeIndex(initialIndex, outputPath);

      // Delete a file
      await rm(join(contentDir, "post2.md"));

      const updatedIndex = await updateIndex(config);

      expect(updatedIndex.entries).toHaveProperty("post1.md");
      expect(updatedIndex.entries).not.toHaveProperty("post2.md");
    });

    it("should build from scratch if no existing index", async () => {
      const config: IndexConfig = {
        contentRoot: contentDir,
        outputPath: join(tempDir, ".vibe", "content-index.json"),
        incremental: true,
      };

      await writeFile(
        join(contentDir, "post.md"),
        `---
title: Post
---
# Post`,
      );

      const index = await updateIndex(config);

      expect(index.entries).toHaveProperty("post.md");
    });
  });

  describe("writeIndex", () => {
    it("should write index to JSON file", async () => {
      const outputPath = join(tempDir, ".vibe", "content-index.json");

      await writeFile(
        join(contentDir, "post.md"),
        `---
title: Post
---
# Post`,
      );

      const config: IndexConfig = {
        contentRoot: contentDir,
      };

      const index = await buildIndex(config);
      await writeIndex(index, outputPath);

      const content = await readFile(outputPath, "utf-8");
      const parsed = JSON.parse(content) as ContentIndex;

      expect(parsed.entries).toHaveProperty("post.md");
      expect(parsed.generatedAt).toBeTruthy();
    });

    it("should create directory if it does not exist", async () => {
      const outputPath = join(tempDir, "nested", "dir", "index.json");

      const index: ContentIndex = {
        entries: {},
        generatedAt: new Date().toISOString(),
        contentRoot: contentDir,
      };

      await writeIndex(index, outputPath);

      const content = await readFile(outputPath, "utf-8");
      expect(content).toBeTruthy();
    });
  });

  describe("indexContent", () => {
    it("should build index and write to file", async () => {
      const outputPath = join(tempDir, ".vibe", "content-index.json");

      await writeFile(
        join(contentDir, "post.md"),
        `---
title: Post
---
# Post`,
      );

      const config: IndexConfig = {
        contentRoot: contentDir,
        outputPath,
      };

      const index = await indexContent(config);

      expect(index.entries).toHaveProperty("post.md");

      const fileContent = await readFile(outputPath, "utf-8");
      const parsed = JSON.parse(fileContent) as ContentIndex;
      expect(parsed.entries).toHaveProperty("post.md");
    });

    it("should use incremental update when enabled", async () => {
      const outputPath = join(tempDir, ".vibe", "content-index.json");

      await writeFile(
        join(contentDir, "post1.md"),
        `---
title: First
---
# First`,
      );

      const config: IndexConfig = {
        contentRoot: contentDir,
        outputPath,
        incremental: true,
      };

      // First build
      await indexContent(config);

      // Add new file
      await writeFile(
        join(contentDir, "post2.md"),
        `---
title: Second
---
# Second`,
      );

      // Update
      const index = await indexContent(config);

      expect(index.entries).toHaveProperty("post1.md");
      expect(index.entries).toHaveProperty("post2.md");
    });
  });

  describe("frontmatter parsing", () => {
    it("should parse simple key-value pairs", async () => {
      await writeFile(
        join(contentDir, "post.md"),
        `---
title: My Post
type: blog
---
# Content`,
      );

      const index = await buildIndex({ contentRoot: contentDir });

      expect(index.entries["post.md"].title).toBe("My Post");
      expect(index.entries["post.md"].type).toBe("blog");
    });

    it("should parse quoted values", async () => {
      await writeFile(
        join(contentDir, "post.md"),
        `---
title: "My Post"
description: 'A description'
---
# Content`,
      );

      const index = await buildIndex({ contentRoot: contentDir });

      expect(index.entries["post.md"].title).toBe("My Post");
      expect(index.entries["post.md"].description).toBe("A description");
    });

    it("should parse array tags", async () => {
      await writeFile(
        join(contentDir, "post.md"),
        `---
title: Post
tags:
  - tech
  - news
  - blog
---
# Content`,
      );

      const index = await buildIndex({ contentRoot: contentDir });

      expect(index.entries["post.md"].tags).toEqual(["tech", "news", "blog"]);
    });
  });
});
