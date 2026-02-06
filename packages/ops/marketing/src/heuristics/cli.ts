/**
 * Heuristics — CLI Commands
 *
 * Implements `npx vibe marketing heuristics list` and
 * `npx vibe marketing heuristics create`.
 */

import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import {
  HEURISTIC_TYPES,
  HEURISTIC_TEMPLATES,
  type HeuristicType,
} from "./types.js";
import { loadHeuristics, loadHeuristicsByType } from "./loader.js";

// ---------------------------------------------------------------------------
// List Heuristics
// ---------------------------------------------------------------------------

export interface ListHeuristicsOptions {
  /** Filter by type */
  type?: HeuristicType;

  /** Show only active heuristics */
  activeOnly?: boolean;

  /** Tags filter */
  tag?: string;
}

export interface HeuristicListItem {
  id: string;
  title: string;
  type: HeuristicType;
  active: boolean;
  tags: string[];
  filePath: string;
}

/**
 * List heuristics with optional filtering.
 */
export async function listHeuristics(
  heuristicsDir: string,
  options: ListHeuristicsOptions = {},
): Promise<HeuristicListItem[]> {
  let heuristics = options.type
    ? await loadHeuristicsByType(heuristicsDir, options.type)
    : await loadHeuristics(heuristicsDir);

  if (options.activeOnly) {
    heuristics = heuristics.filter((h) => h.frontmatter.active);
  }

  if (options.tag) {
    heuristics = heuristics.filter((h) =>
      h.frontmatter.tags.includes(options.tag!),
    );
  }

  return heuristics.map((h) => ({
    id: h.frontmatter.id,
    title: h.frontmatter.title,
    type: h.frontmatter.type,
    active: h.frontmatter.active,
    tags: h.frontmatter.tags,
    filePath: h.filePath,
  }));
}

// ---------------------------------------------------------------------------
// Create Heuristic
// ---------------------------------------------------------------------------

export interface CreateHeuristicOptions {
  /** Heuristic type */
  type: HeuristicType;

  /** Name (used to derive ID and filename) */
  name: string;

  /** Base directory for heuristics content */
  heuristicsDir: string;
}

export interface CreateHeuristicResult {
  /** Created file path */
  filePath: string;

  /** Heuristic ID */
  id: string;

  /** Heuristic type */
  type: HeuristicType;
}

/**
 * Create a new heuristic file from template.
 */
export async function createHeuristic(
  options: CreateHeuristicOptions,
): Promise<CreateHeuristicResult> {
  const { type, name, heuristicsDir } = options;

  // Validate type
  if (!HEURISTIC_TYPES.includes(type)) {
    throw new Error(
      `Invalid heuristic type: "${type}". Valid types: ${HEURISTIC_TYPES.join(", ")}`,
    );
  }

  // Derive ID and filename
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const title = name.replace(/\b\w/g, (c) => c.toUpperCase());
  const filename = `${id}.md`;

  // Determine directory (pluralized type name)
  const typeDir = `${type}s`;
  const dirPath = join(heuristicsDir, typeDir);
  const filePath = join(dirPath, filename);

  // Get template and replace placeholders
  const template = HEURISTIC_TEMPLATES[type];
  const content = template.replace(/\{id\}/g, id).replace(/\{title\}/g, title);

  // Create directory and write file
  await mkdir(dirPath, { recursive: true });
  await writeFile(filePath, content, "utf-8");

  return { filePath, id, type };
}

// ---------------------------------------------------------------------------
// Format Helpers (for CLI output)
// ---------------------------------------------------------------------------

/**
 * Format heuristic list for CLI output.
 */
export function formatHeuristicList(items: HeuristicListItem[]): string {
  if (items.length === 0) {
    return "No heuristics found.";
  }

  const lines: string[] = [];

  // Group by type
  const grouped = new Map<string, HeuristicListItem[]>();
  for (const item of items) {
    const group = grouped.get(item.type) ?? [];
    group.push(item);
    grouped.set(item.type, group);
  }

  for (const [type, groupItems] of grouped) {
    lines.push(`\n  ${type.toUpperCase()} (${groupItems.length}):`);
    for (const item of groupItems) {
      const status = item.active ? "+" : "-";
      const tags = item.tags.length > 0 ? ` [${item.tags.join(", ")}]` : "";
      lines.push(`    ${status} ${item.id} — ${item.title}${tags}`);
    }
  }

  lines.push(`\n  Total: ${items.length} heuristic(s)`);

  return lines.join("\n");
}
