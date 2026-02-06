/**
 * HMR File Watcher Matrix
 *
 * Consolidated file watcher for the entire project.
 * Routes changes by file type to appropriate handlers.
 *
 * File type routing:
 * - .ts → hot reload API
 * - React (.tsx) → Vite HMR
 * - Drizzle schema → detect + suggest `vibe db migrate`
 * - content/*.md → incremental site rebuild + content index update
 * - vibe.config.ts → full restart with warning
 * - SKILL.md → regeneration (debounced 500ms)
 */

import { join, extname, relative, basename, dirname } from "node:path";
import { existsSync } from "node:fs";

/**
 * File change event types.
 */
export type ChangeType = "add" | "change" | "unlink";

/**
 * Categorized file change action.
 */
export type FileAction =
  | { type: "api-reload"; path: string }
  | { type: "vite-hmr"; path: string }
  | { type: "schema-change"; path: string; suggestion: string }
  | { type: "content-rebuild"; path: string }
  | { type: "config-restart"; path: string; warning: string }
  | { type: "skillmd-regen"; path: string }
  | { type: "ignore"; path: string };

/**
 * Watcher options.
 */
export interface WatcherOptions {
  readonly projectRoot: string;
  readonly ignored?: readonly string[];
  readonly debounceMs?: number;
}

/**
 * Default ignored patterns.
 */
export const DEFAULT_IGNORED = [
  "**/node_modules/**",
  "**/dist/**",
  "**/.git/**",
  "**/.vibe/**",
  "**/coverage/**",
] as const;

/**
 * Classify a file change into an action.
 */
export function classifyChange(
  filePath: string,
  projectRoot: string,
): FileAction {
  const rel = relative(projectRoot, filePath);
  const ext = extname(filePath);
  const name = basename(filePath);

  // Config restart
  if (name === "vibe.config.ts" || name === "vibe.config.js") {
    return {
      type: "config-restart",
      path: rel,
      warning: "Configuration changed. Dev server will restart.",
    };
  }

  // SKILL.md regeneration
  if (name === "SKILL.md") {
    return { type: "skillmd-regen", path: rel };
  }

  // Drizzle schema changes
  if (rel.includes("schema") && ext === ".ts" && !rel.includes(".test.")) {
    return {
      type: "schema-change",
      path: rel,
      suggestion:
        "Schema changed. Run `npx vibe db migrate` to create a migration.",
    };
  }

  // Content markdown changes
  if (rel.startsWith("content/") && (ext === ".md" || ext === ".mdx")) {
    return { type: "content-rebuild", path: rel };
  }

  // React components → Vite HMR
  if (ext === ".tsx" || ext === ".jsx") {
    return { type: "vite-hmr", path: rel };
  }

  // TypeScript API files → hot reload
  if (ext === ".ts" && !rel.includes(".test.") && !rel.includes(".spec.")) {
    return { type: "api-reload", path: rel };
  }

  // CSS/SCSS → Vite HMR
  if (ext === ".css" || ext === ".scss") {
    return { type: "vite-hmr", path: rel };
  }

  // Everything else
  return { type: "ignore", path: rel };
}

/**
 * Create a debounced function that only executes after a delay.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number,
): T {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return ((...args: unknown[]) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delayMs);
  }) as T;
}

/**
 * Batch multiple file changes into aggregated actions.
 * Groups changes of the same type within a time window.
 */
export function batchChanges(
  actions: readonly FileAction[],
): readonly FileAction[] {
  // Deduplicate by path
  const seen = new Set<string>();
  const unique: FileAction[] = [];

  for (const action of actions) {
    if (!seen.has(action.path)) {
      seen.add(action.path);
      unique.push(action);
    }
  }

  // Config restart takes priority over everything
  const hasRestart = unique.some((a) => a.type === "config-restart");
  if (hasRestart) {
    return unique.filter((a) => a.type === "config-restart").slice(0, 1);
  }

  return unique;
}

/**
 * Format a file action for console output.
 */
export function formatAction(action: FileAction): string {
  switch (action.type) {
    case "api-reload":
      return `[API] Reloading: ${action.path}`;
    case "vite-hmr":
      return `[HMR] Updated: ${action.path}`;
    case "schema-change":
      return `[Schema] ${action.suggestion}`;
    case "content-rebuild":
      return `[Content] Rebuilding: ${action.path}`;
    case "config-restart":
      return `[Config] ${action.warning}`;
    case "skillmd-regen":
      return `[SKILL.md] Regenerating: ${action.path}`;
    case "ignore":
      return "";
  }
}
