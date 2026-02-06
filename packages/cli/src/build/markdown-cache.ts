/**
 * Markdown Parse Cache
 *
 * Caches parsed markdown ASTs in .vibe/markdown-cache/ keyed by content hash.
 * Re-parse only changed files. Used by all Sites builds.
 * Target: 500 pages <10s.
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "node:fs";
import { join, relative, extname } from "node:path";
import { createHash } from "node:crypto";

/**
 * Parsed markdown result with frontmatter and content.
 */
export interface ParsedMarkdown {
  readonly filePath: string;
  readonly contentHash: string;
  readonly frontmatter: Record<string, unknown>;
  readonly content: string;
  readonly excerpt: string;
  readonly headings: readonly MarkdownHeading[];
  readonly wordCount: number;
}

/**
 * Markdown heading extracted from content.
 */
export interface MarkdownHeading {
  readonly depth: number;
  readonly text: string;
  readonly id: string;
}

/**
 * Cache stats.
 */
export interface MarkdownCacheStats {
  readonly totalEntries: number;
  readonly hits: number;
  readonly misses: number;
  readonly parseTimeMs: number;
}

/**
 * Parse frontmatter from a markdown string.
 */
export function parseFrontmatter(content: string): {
  frontmatter: Record<string, unknown>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)/);

  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const fmRaw = match[1]!;
  const body = match[2]!;

  // Simple YAML-like frontmatter parser
  const frontmatter: Record<string, unknown> = {};
  const lines = fmRaw.split("\n");

  for (const line of lines) {
    const kvMatch = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1]!;
      let value: unknown = kvMatch[2]!.trim();

      // Parse common types
      if (value === "true") value = true;
      else if (value === "false") value = false;
      else if (/^\d+$/.test(value as string))
        value = parseInt(value as string, 10);
      else if (
        (value as string).startsWith('"') &&
        (value as string).endsWith('"')
      ) {
        value = (value as string).slice(1, -1);
      }

      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * Extract headings from markdown content.
 */
export function extractHeadings(content: string): readonly MarkdownHeading[] {
  const headings: MarkdownHeading[] = [];
  const lines = content.split("\n");

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const depth = match[1]!.length;
      const text = match[2]!.trim();
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      headings.push({ depth, text, id });
    }
  }

  return headings;
}

/**
 * Count words in content.
 */
export function countWords(content: string): number {
  return content
    .replace(/[#*_`[\]()>-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

/**
 * Generate an excerpt from content.
 */
export function generateExcerpt(content: string, maxLength = 200): string {
  // Strip markdown formatting
  const plain = content
    .replace(/^#+\s+.+$/gm, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`~]/g, "")
    .replace(/\n+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;
  return plain.substring(0, maxLength).replace(/\s+\S*$/, "") + "...";
}

/**
 * Markdown cache manager.
 */
export class MarkdownCache {
  private readonly cacheDir: string;
  private readonly manifestPath: string;
  private manifest: Record<string, { hash: string; cachedAt: string }>;
  private stats: { hits: number; misses: number; parseTimeMs: number };

  constructor(projectRoot: string) {
    this.cacheDir = join(projectRoot, ".vibe", "markdown-cache");
    this.manifestPath = join(this.cacheDir, "manifest.json");
    this.manifest = this.loadManifest();
    this.stats = { hits: 0, misses: 0, parseTimeMs: 0 };
  }

  /**
   * Compute content hash.
   */
  computeHash(content: string): string {
    return createHash("sha256").update(content).digest("hex").substring(0, 16);
  }

  /**
   * Parse a markdown file, using cache when possible.
   */
  parse(filePath: string): ParsedMarkdown {
    const raw = readFileSync(filePath, "utf-8");
    const contentHash = this.computeHash(raw);

    // Check cache
    const cacheFile = join(this.cacheDir, `${contentHash}.json`);
    const cached = this.manifest[filePath];

    if (cached && cached.hash === contentHash && existsSync(cacheFile)) {
      this.stats.hits++;
      return JSON.parse(readFileSync(cacheFile, "utf-8")) as ParsedMarkdown;
    }

    // Cache miss — parse
    const start = performance.now();
    this.stats.misses++;

    const { frontmatter, body } = parseFrontmatter(raw);
    const headings = extractHeadings(body);
    const wordCount = countWords(body);
    const excerpt = generateExcerpt(body);

    const result: ParsedMarkdown = {
      filePath,
      contentHash,
      frontmatter,
      content: body,
      excerpt,
      headings,
      wordCount,
    };

    // Store in cache
    this.ensureCacheDir();
    writeFileSync(cacheFile, JSON.stringify(result, null, 2), "utf-8");
    this.manifest[filePath] = {
      hash: contentHash,
      cachedAt: new Date().toISOString(),
    };
    this.saveManifest();

    this.stats.parseTimeMs += Math.round(performance.now() - start);

    return result;
  }

  /**
   * Parse multiple files in parallel.
   */
  async parseMany(
    filePaths: readonly string[],
  ): Promise<readonly ParsedMarkdown[]> {
    return filePaths.map((fp) => this.parse(fp));
  }

  /**
   * Get cache statistics.
   */
  getStats(): MarkdownCacheStats {
    return {
      totalEntries: Object.keys(this.manifest).length,
      ...this.stats,
    };
  }

  /**
   * Clear the cache.
   */
  clear(): void {
    this.manifest = {};
    if (existsSync(this.cacheDir)) {
      const files = readdirSync(this.cacheDir);
      for (const file of files) {
        unlinkSync(join(this.cacheDir, file));
      }
    }
  }

  private ensureCacheDir(): void {
    if (!existsSync(this.cacheDir)) {
      mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  private loadManifest(): Record<string, { hash: string; cachedAt: string }> {
    if (existsSync(this.manifestPath)) {
      try {
        return JSON.parse(readFileSync(this.manifestPath, "utf-8"));
      } catch {
        return {};
      }
    }
    return {};
  }

  private saveManifest(): void {
    this.ensureCacheDir();
    writeFileSync(
      this.manifestPath,
      JSON.stringify(this.manifest, null, 2),
      "utf-8",
    );
  }
}
