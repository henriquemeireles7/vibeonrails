/**
 * Support Feedback — CLI Commands
 *
 * Implements:
 * - `npx vibe support feedback summary` — AI summary of recent feedback
 * - `npx vibe support feedback export` — Export feedback to CSV/JSON
 *
 * Usage:
 *   import { feedbackSummary, feedbackExport } from '@vibeonrails/support-feedback';
 *
 *   const summary = await feedbackSummary({
 *     projectRoot: '/path/to/project',
 *     since: '7d',
 *   });
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import type {
  FeedbackSummary,
  FeedbackExportOptions,
  JsonlEntry,
  ClassificationCategory,
  FeedbackSource,
} from "./types.js";

// ---------------------------------------------------------------------------
// JSONL Reader
// ---------------------------------------------------------------------------

/**
 * Read and parse JSONL file entries.
 */
async function readJsonlEntries(jsonlPath: string): Promise<JsonlEntry[]> {
  let content: string;
  try {
    content = await readFile(jsonlPath, "utf-8");
  } catch {
    return [];
  }

  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line) as JsonlEntry;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is JsonlEntry => entry !== null);
}

// ---------------------------------------------------------------------------
// Time Filtering
// ---------------------------------------------------------------------------

/**
 * Parse a duration string (e.g., '7d', '30d', '1h') into milliseconds.
 */
export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([dhms])$/);
  if (!match) return 0;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    d: 86400000,
    h: 3600000,
    m: 60000,
    s: 1000,
  };

  return value * (multipliers[unit] ?? 0);
}

/**
 * Filter entries by time window.
 */
function filterByTime(entries: JsonlEntry[], since?: string): JsonlEntry[] {
  if (!since) return entries;

  const durationMs = parseDuration(since);
  if (durationMs === 0) return entries;

  const cutoff = new Date(Date.now() - durationMs).toISOString();
  return entries.filter((e) => e.timestamp >= cutoff);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export interface SummaryOptions {
  /** Project root directory */
  projectRoot: string;

  /** Time filter (e.g., '7d', '30d') */
  since?: string;

  /** Path to JSONL file */
  jsonlPath?: string;
}

/**
 * Generate a feedback summary from the JSONL log.
 */
export async function feedbackSummary(
  options: SummaryOptions,
): Promise<FeedbackSummary> {
  const jsonlPath =
    options.jsonlPath ??
    join(options.projectRoot, "content", "feedback", "requests.jsonl");

  const allEntries = await readJsonlEntries(jsonlPath);
  const entries = filterByTime(allEntries, options.since);

  // Count by category
  const byCategory: Record<ClassificationCategory, number> = {
    bug: 0,
    "feature-aligned": 0,
    "feature-unaligned": 0,
    question: 0,
    complaint: 0,
  };
  for (const entry of entries) {
    if (entry.category in byCategory) {
      byCategory[entry.category] += 1;
    }
  }

  // Count by source
  const bySource: Record<FeedbackSource, number> = {
    chat: 0,
    api: 0,
    email: 0,
    github: 0,
    manual: 0,
  };
  for (const entry of entries) {
    if (entry.source in bySource) {
      bySource[entry.source] += 1;
    }
  }

  // Count tags
  const tagCounts = new Map<string, number>();
  for (const entry of entries) {
    for (const tag of entry.tags) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }));

  // Count slugs for top issues
  const slugCounts = new Map<
    string,
    { count: number; category: ClassificationCategory }
  >();
  for (const entry of entries) {
    const existing = slugCounts.get(entry.slug);
    if (existing) {
      existing.count += 1;
    } else {
      slugCounts.set(entry.slug, { count: 1, category: entry.category });
    }
  }
  const topIssues = Array.from(slugCounts.entries())
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([title, { count, category }]) => ({ title, count, category }));

  return {
    period: options.since ?? "all",
    total: entries.length,
    byCategory,
    bySource,
    topTags,
    topIssues,
  };
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

/**
 * Export feedback to CSV or JSON format.
 */
export async function feedbackExport(
  options: FeedbackExportOptions & { projectRoot: string; jsonlPath?: string },
): Promise<void> {
  const jsonlPath =
    options.jsonlPath ??
    join(options.projectRoot, "content", "feedback", "requests.jsonl");

  const allEntries = await readJsonlEntries(jsonlPath);
  let entries = filterByTime(allEntries, options.since);

  // Filter by category if specified
  if (options.category) {
    entries = entries.filter((e) => e.category === options.category);
  }

  // Ensure output directory exists
  await mkdir(dirname(options.outputPath), { recursive: true });

  if (options.format === "json") {
    await writeFile(
      options.outputPath,
      JSON.stringify(entries, null, 2),
      "utf-8",
    );
  } else {
    // CSV
    const header = "timestamp,source,category,userId,slug,content,tags\n";
    const rows = entries
      .map(
        (e) =>
          `"${e.timestamp}","${e.source}","${e.category}","${e.userId ?? ""}","${e.slug}","${e.content.replace(/"/g, '""')}","${e.tags.join(";")}"`,
      )
      .join("\n");
    await writeFile(options.outputPath, header + rows, "utf-8");
  }
}
