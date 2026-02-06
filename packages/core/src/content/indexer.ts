/**
 * Build-Time Content Indexer
 *
 * Scans content directories, parses YAML frontmatter from markdown files,
 * and builds an in-memory index. Supports incremental indexing via mtime comparison.
 *
 * NOTE: This is build-time/CLI only, never runtime.
 */

import { readFile, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import type {
  ContentEntry,
  ContentIndex,
  IndexConfig,
  Frontmatter,
} from "./types.js";
import { frontmatterSchema } from "./types.js";

// ---------------------------------------------------------------------------
// Frontmatter Parser
// ---------------------------------------------------------------------------

/**
 * Parse YAML frontmatter from markdown content using regex.
 * Supports key: value pairs and arrays with - prefix.
 */
function parseFrontmatter(content: string): {
  frontmatter: Frontmatter;
  body: string;
} {
  // Match frontmatter between --- delimiters at start of file
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    return {
      frontmatter: {},
      body: content,
    };
  }

  const frontmatterText = match[1];
  const body = match[2];

  // Parse YAML-like key: value pairs
  const frontmatter: Record<string, unknown> = {};
  const lines = frontmatterText.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Array item: - value
    if (trimmed.startsWith("-")) {
      const value = trimmed.slice(1).trim();
      // If previous line was a key, add to that key's array
      const lastKey = Object.keys(frontmatter).pop();
      if (lastKey && Array.isArray(frontmatter[lastKey])) {
        (frontmatter[lastKey] as unknown[]).push(value);
      } else {
        // New array
        const arrayKey = "tags"; // Default to tags if no key
        if (!frontmatter[arrayKey]) {
          frontmatter[arrayKey] = [];
        }
        (frontmatter[arrayKey] as unknown[]).push(value);
      }
      continue;
    }

    // Key: value pair
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();

      // Remove quotes if present
      const unquotedValue = value.replace(/^["']|["']$/g, "");

      // Try to parse as array if it looks like one
      if (unquotedValue.startsWith("[") && unquotedValue.endsWith("]")) {
        try {
          frontmatter[key] = JSON.parse(unquotedValue);
        } catch {
          frontmatter[key] = unquotedValue;
        }
      } else {
        frontmatter[key] = unquotedValue;
      }
    }
  }

  // Validate with Zod schema
  const result = frontmatterSchema.safeParse(frontmatter);
  const validated = result.success ? result.data : {};

  return {
    frontmatter: validated,
    body,
  };
}

// ---------------------------------------------------------------------------
// File Scanner
// ---------------------------------------------------------------------------

/**
 * Recursively scan directory for markdown files.
 */
async function scanMarkdownFiles(
  dir: string,
  baseDir: string,
): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await scanMarkdownFiles(fullPath, baseDir);
        files.push(...subFiles);
      } else if (entry.isFile() && extname(entry.name) === ".md") {
        const relativePath = relative(baseDir, fullPath);
        files.push(relativePath);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return files;
}

// ---------------------------------------------------------------------------
// Entry Builder
// ---------------------------------------------------------------------------

/**
 * Build a ContentEntry from a markdown file.
 */
async function buildEntry(
  filePath: string,
  contentRoot: string,
): Promise<ContentEntry | null> {
  const fullPath = join(contentRoot, filePath);

  try {
    const content = await readFile(fullPath, "utf-8");
    const stats = await stat(fullPath);

    const { frontmatter, body } = parseFrontmatter(content);

    // Extract title from frontmatter or filename
    const filename = filePath.split("/").pop()?.replace(/\.md$/, "") ?? "";
    const title = frontmatter.title ?? filename;

    // Extract type from frontmatter or infer from directory
    const pathParts = filePath.split("/");
    const type =
      frontmatter.type ?? (pathParts.length > 1 ? pathParts[0] : "page");

    // Extract tags
    const tags = frontmatter.tags ?? [];

    // Extract date
    const date = frontmatter.date ?? null;

    // Extract description
    const description = frontmatter.description ?? null;

    // Extract content snippet (first 200 chars, no frontmatter)
    const snippet = body.trim().slice(0, 200).replace(/\n/g, " ");

    return {
      path: filePath,
      title,
      type,
      tags,
      date,
      description,
      contentSnippet: snippet,
      mtime: stats.mtime.toISOString(),
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Index Loader
// ---------------------------------------------------------------------------

/**
 * Load existing index from JSON file.
 */
async function loadIndex(outputPath: string): Promise<ContentIndex | null> {
  try {
    const content = await readFile(outputPath, "utf-8");
    return JSON.parse(content) as ContentIndex;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Index Builder
// ---------------------------------------------------------------------------

/**
 * Build content index from scratch.
 */
export async function buildIndex(config: IndexConfig): Promise<ContentIndex> {
  const { contentRoot } = config;

  // Scan all markdown files
  const files = await scanMarkdownFiles(contentRoot, contentRoot);

  // Build entries
  const entries: Record<string, ContentEntry> = {};
  const entryPromises = files.map(async (filePath) => {
    const entry = await buildEntry(filePath, contentRoot);
    if (entry) {
      entries[entry.path] = entry;
    }
  });

  await Promise.all(entryPromises);

  const index: ContentIndex = {
    entries,
    generatedAt: new Date().toISOString(),
    contentRoot,
  };

  return index;
}

// ---------------------------------------------------------------------------
// Incremental Indexer
// ---------------------------------------------------------------------------

/**
 * Update index incrementally by checking mtime.
 */
export async function updateIndex(config: IndexConfig): Promise<ContentIndex> {
  const { contentRoot, outputPath } = config;

  if (!outputPath) {
    // No existing index, build from scratch
    return buildIndex(config);
  }

  // Load existing index
  const existingIndex = await loadIndex(outputPath);
  if (!existingIndex) {
    return buildIndex(config);
  }

  // Scan current files
  const currentFiles = await scanMarkdownFiles(contentRoot, contentRoot);
  const entries: Record<string, ContentEntry> = { ...existingIndex.entries };

  // Check each file
  for (const filePath of currentFiles) {
    const fullPath = join(contentRoot, filePath);
    try {
      const stats = await stat(fullPath);
      const existingEntry = entries[filePath];

      // If file doesn't exist in index or mtime changed, rebuild entry
      if (
        !existingEntry ||
        new Date(existingEntry.mtime).getTime() !== stats.mtime.getTime()
      ) {
        const entry = await buildEntry(filePath, contentRoot);
        if (entry) {
          entries[entry.path] = entry;
        }
      }
    } catch {
      // File was deleted or can't be read
      delete entries[filePath];
    }
  }

  // Remove entries for files that no longer exist
  for (const path in entries) {
    if (!currentFiles.includes(path)) {
      delete entries[path];
    }
  }

  const index: ContentIndex = {
    entries,
    generatedAt: new Date().toISOString(),
    contentRoot,
  };

  return index;
}

// ---------------------------------------------------------------------------
// Index Writer
// ---------------------------------------------------------------------------

/**
 * Write index to JSON file.
 */
export async function writeIndex(
  index: ContentIndex,
  outputPath: string,
): Promise<void> {
  const dir = outputPath.split("/").slice(0, -1).join("/");
  if (dir) {
    await mkdir(dir, { recursive: true });
  }

  await writeFile(outputPath, JSON.stringify(index, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Main Index Function
// ---------------------------------------------------------------------------

/**
 * Build or update content index.
 */
export async function indexContent(config: IndexConfig): Promise<ContentIndex> {
  const index = config.incremental
    ? await updateIndex(config)
    : await buildIndex(config);

  // Write to file if output path specified
  if (config.outputPath) {
    await writeIndex(index, config.outputPath);
  }

  return index;
}
