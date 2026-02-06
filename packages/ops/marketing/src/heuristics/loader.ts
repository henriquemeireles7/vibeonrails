/**
 * Heuristics — Loader
 *
 * Loads heuristics from content/marketing/heuristics/ directory.
 * Supports filtering by type, validation against Zod schemas,
 * and git hash tracking for generated content provenance.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative, extname, basename } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  HEURISTIC_TYPES,
  HEURISTIC_SCHEMA_MAP,
  type HeuristicType,
  type HeuristicFrontmatter,
  type LoadedHeuristic,
} from "./types.js";

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// Frontmatter Parser
// ---------------------------------------------------------------------------

/**
 * Parse YAML frontmatter from markdown content.
 * Returns parsed key-value pairs and body content.
 */
export function parseFrontmatter(content: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const regex = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;
  const match = content.match(regex);

  if (!match) {
    return { data: {}, body: content };
  }

  const frontmatterText = match[1] ?? "";
  const body = match[2] ?? "";
  const data: Record<string, unknown> = {};
  const lines = frontmatterText.split("\n");

  let currentKey: string | null = null;
  let currentIsArray = false;
  let currentIsObject = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    // Detect indentation level (for nested keys and array items)
    const indent = line.length - line.trimStart().length;

    // Array item: starts with "  - " or "- " (indented)
    if (/^\s*-\s/.test(line) && indent > 0) {
      const value = trimmed
        .slice(1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (currentKey && Array.isArray(data[currentKey])) {
        (data[currentKey] as string[]).push(value);
      }
      continue;
    }

    // Nested key: value pair (indented under a parent key)
    if (indent > 0 && currentKey && currentIsObject) {
      const colonIndex = trimmed.indexOf(":");
      if (colonIndex > 0) {
        const nestedKey = trimmed.slice(0, colonIndex).trim();
        const rawValue = trimmed.slice(colonIndex + 1).trim();
        const isQuoted = /^["'].*["']$/.test(rawValue);
        const unquoted = rawValue.replace(/^["']|["']$/g, "");

        const parent = data[currentKey] as Record<string, unknown>;
        parent[nestedKey] = isQuoted ? unquoted : parseValue(unquoted);
      }
      continue;
    }

    // Top-level key: value pair
    const colonIndex = trimmed.indexOf(":");
    if (colonIndex > 0) {
      const key = trimmed.slice(0, colonIndex).trim();
      const rawValue = trimmed.slice(colonIndex + 1).trim();
      currentKey = key;
      currentIsArray = false;
      currentIsObject = false;

      if (rawValue === "[]") {
        data[key] = [];
        currentIsArray = true;
        continue;
      }

      if (rawValue === "" || rawValue === "{}") {
        // Could be an object or array — peek at next lines to determine
        // Default to array (for YAML list syntax), but if next indented
        // line has "key: value" pattern, treat as object
        const nextLineIdx = lines.indexOf(line) + 1;
        const nextLine = nextLineIdx < lines.length ? lines[nextLineIdx] : "";
        const nextTrimmed = nextLine?.trim() ?? "";
        const nextIndent =
          (nextLine?.length ?? 0) - (nextLine?.trimStart().length ?? 0);

        if (
          nextIndent > 0 &&
          !nextTrimmed.startsWith("-") &&
          nextTrimmed.includes(":")
        ) {
          // Next indented line is key: value, so this is an object
          data[key] = {};
          currentIsObject = true;
        } else {
          data[key] = [];
          currentIsArray = true;
        }
        continue;
      }

      // Check if value is quoted
      const isQuoted = /^["'].*["']$/.test(rawValue);
      const unquoted = rawValue.replace(/^["']|["']$/g, "");

      // Parse JSON arrays
      if (unquoted.startsWith("[") && unquoted.endsWith("]")) {
        try {
          data[key] = JSON.parse(unquoted);
          currentIsArray = true;
          continue;
        } catch {
          // Not valid JSON, treat as string
        }
      }

      // If quoted, always keep as string
      if (isQuoted) {
        data[key] = unquoted;
        continue;
      }

      data[key] = parseValue(unquoted);
    }
  }

  return { data, body };
}

/**
 * Parse a raw YAML value (unquoted) into its JS type.
 */
function parseValue(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null" || value === "~") return null;

  const num = Number(value);
  if (!Number.isNaN(num) && value !== "") {
    return num;
  }

  return value;
}

// ---------------------------------------------------------------------------
// Git Hash Resolver
// ---------------------------------------------------------------------------

/**
 * Get the git hash of a file (short SHA).
 * Returns null if git is not available or file is not tracked.
 */
export async function getGitHash(filePath: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", [
      "log",
      "-1",
      "--format=%h",
      "--",
      filePath,
    ]);
    const hash = stdout.trim();
    return hash || null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// File Scanner
// ---------------------------------------------------------------------------

/**
 * Recursively scan a directory for markdown files.
 */
async function scanDirectory(dir: string): Promise<string[]> {
  const files: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        const subFiles = await scanDirectory(fullPath);
        files.push(...subFiles);
      } else if (entry.isFile() && extname(entry.name) === ".md") {
        files.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return files;
}

// ---------------------------------------------------------------------------
// Single Heuristic Loader
// ---------------------------------------------------------------------------

/**
 * Load and validate a single heuristic file.
 */
export async function loadHeuristicFile(
  filePath: string,
  heuristicsRoot: string,
): Promise<LoadedHeuristic | null> {
  try {
    const content = await readFile(filePath, "utf-8");
    const { data, body } = parseFrontmatter(content);

    // Derive ID from filename if not in frontmatter
    if (!data.id) {
      data.id = basename(filePath, ".md");
    }

    // Derive title from ID if not in frontmatter
    if (!data.title) {
      data.title = String(data.id)
        .replace(/-/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    // Infer type from directory name if not in frontmatter
    if (!data.type) {
      const relativePath = relative(heuristicsRoot, filePath);
      const pathParts = relativePath.split("/");
      if (pathParts.length > 1) {
        const dirName = pathParts[0];
        // Handle plural directory names (e.g., "clients" -> "client")
        const singularDir = dirName?.endsWith("s")
          ? dirName.slice(0, -1)
          : dirName;
        if (
          singularDir &&
          HEURISTIC_TYPES.includes(singularDir as HeuristicType)
        ) {
          data.type = singularDir;
        }
      }
    }

    // Validate against the appropriate schema
    const type = data.type as HeuristicType;
    if (!type || !HEURISTIC_TYPES.includes(type)) {
      return null;
    }

    const schema = HEURISTIC_SCHEMA_MAP[type];
    const result = schema.safeParse(data);

    if (!result.success) {
      return null;
    }

    const gitHash = await getGitHash(filePath);

    return {
      frontmatter: result.data as HeuristicFrontmatter,
      body: body.trim(),
      filePath: relative(heuristicsRoot, filePath),
      absolutePath: filePath,
      gitHash,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Bulk Loader
// ---------------------------------------------------------------------------

/**
 * Load all heuristics from a directory.
 * Validates each file against its type-specific schema.
 */
export async function loadHeuristics(
  heuristicsRoot: string,
): Promise<LoadedHeuristic[]> {
  const files = await scanDirectory(heuristicsRoot);

  const loadPromises = files.map((filePath) =>
    loadHeuristicFile(filePath, heuristicsRoot),
  );

  const results = await Promise.all(loadPromises);
  return results.filter((h): h is LoadedHeuristic => h !== null);
}

/**
 * Load heuristics filtered by type.
 */
export async function loadHeuristicsByType(
  heuristicsRoot: string,
  type: HeuristicType,
): Promise<LoadedHeuristic[]> {
  const all = await loadHeuristics(heuristicsRoot);
  return all.filter((h) => h.frontmatter.type === type);
}

/**
 * Load a single heuristic by ID and optional type.
 */
export async function loadHeuristicById(
  heuristicsRoot: string,
  id: string,
  type?: HeuristicType,
): Promise<LoadedHeuristic | null> {
  const all = type
    ? await loadHeuristicsByType(heuristicsRoot, type)
    : await loadHeuristics(heuristicsRoot);

  return all.find((h) => h.frontmatter.id === id) ?? null;
}

/**
 * Load only active heuristics.
 */
export async function loadActiveHeuristics(
  heuristicsRoot: string,
): Promise<LoadedHeuristic[]> {
  const all = await loadHeuristics(heuristicsRoot);
  return all.filter((h) => h.frontmatter.active);
}

/**
 * Load heuristics filtered by tags.
 */
export async function loadHeuristicsByTag(
  heuristicsRoot: string,
  tag: string,
): Promise<LoadedHeuristic[]> {
  const all = await loadHeuristics(heuristicsRoot);
  return all.filter((h) => h.frontmatter.tags.includes(tag));
}
