/**
 * Undo Stack
 *
 * Stores last N CLI operations with reverse actions in .vibe/undo-stack.json.
 * `vibe undo` reverts the most recent operation.
 *
 * Supported operation types:
 * - add: `vibe add <module>` -> reverse = remove module files
 * - remove: `vibe remove <module>` -> reverse = re-add module files
 * - generate: `vibe generate module <name>` -> reverse = delete generated files
 *
 * Stack depth: 10 operations max (oldest are evicted).
 */

import { Command } from "commander";
import { join } from "node:path";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import chalk from "chalk";
import { createFormatter } from "../output/formatter.js";
import { readFile, writeFile, ensureDir, pathExists } from "../utils/fs.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OperationType = "add" | "remove" | "generate" | "custom";

export interface ReverseAction {
  /** Type of reverse: delete files, restore files, or run a command */
  type: "delete-files" | "restore-files" | "run-command";
  /** File paths to delete (for delete-files) */
  files?: string[];
  /** File contents to restore (for restore-files) */
  restoreData?: Array<{ path: string; content: string }>;
  /** Command to execute (for run-command) */
  command?: string;
}

export interface UndoEntry {
  /** Unique identifier */
  id: string;
  /** Timestamp of the operation */
  timestamp: string;
  /** What operation was performed */
  operation: OperationType;
  /** Human-readable description */
  description: string;
  /** The reverse action to undo this operation */
  reverse: ReverseAction;
}

export interface UndoStack {
  version: 1;
  entries: UndoEntry[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_STACK_DEPTH = 10;
const STACK_FILE = ".vibe/undo-stack.json";

// ---------------------------------------------------------------------------
// Stack Operations
// ---------------------------------------------------------------------------

/** Get the path to the undo stack file relative to a project root. */
export function getStackPath(projectRoot: string): string {
  return join(projectRoot, STACK_FILE);
}

/** Load the undo stack from disk. Returns empty stack if file missing. */
export function loadStack(projectRoot: string): UndoStack {
  const stackPath = getStackPath(projectRoot);
  if (!pathExists(stackPath)) {
    return { version: 1, entries: [] };
  }
  try {
    const raw = readFile(stackPath);
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      "entries" in parsed
    ) {
      return parsed as UndoStack;
    }
    return { version: 1, entries: [] };
  } catch {
    return { version: 1, entries: [] };
  }
}

/** Save the undo stack to disk. Creates .vibe/ if needed. */
export function saveStack(projectRoot: string, stack: UndoStack): void {
  const stackPath = getStackPath(projectRoot);
  const dir = join(projectRoot, ".vibe");
  ensureDir(dir);
  writeFile(stackPath, JSON.stringify(stack, null, 2));
}

/** Push an entry onto the stack. Evicts oldest if over MAX_STACK_DEPTH. */
export function pushEntry(projectRoot: string, entry: UndoEntry): void {
  const stack = loadStack(projectRoot);
  stack.entries.push(entry);
  if (stack.entries.length > MAX_STACK_DEPTH) {
    stack.entries = stack.entries.slice(stack.entries.length - MAX_STACK_DEPTH);
  }
  saveStack(projectRoot, stack);
}

/** Pop the most recent entry from the stack. Returns undefined if empty. */
export function popEntry(projectRoot: string): UndoEntry | undefined {
  const stack = loadStack(projectRoot);
  const entry = stack.entries.pop();
  if (entry) {
    saveStack(projectRoot, stack);
  }
  return entry;
}

/** Peek at the most recent entry without removing it. */
export function peekEntry(projectRoot: string): UndoEntry | undefined {
  const stack = loadStack(projectRoot);
  return stack.entries[stack.entries.length - 1];
}

/** Get the current stack depth. */
export function stackDepth(projectRoot: string): number {
  const stack = loadStack(projectRoot);
  return stack.entries.length;
}

/** Clear the entire undo stack. */
export function clearStack(projectRoot: string): void {
  saveStack(projectRoot, { version: 1, entries: [] });
}

// ---------------------------------------------------------------------------
// Helpers for recording operations
// ---------------------------------------------------------------------------

/** Generate a unique ID for an undo entry. */
export function generateEntryId(): string {
  return `undo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Record a "generate" operation (files created that can be deleted to undo). */
export function recordGenerate(
  projectRoot: string,
  description: string,
  createdFiles: string[],
): void {
  pushEntry(projectRoot, {
    id: generateEntryId(),
    timestamp: new Date().toISOString(),
    operation: "generate",
    description,
    reverse: {
      type: "delete-files",
      files: createdFiles,
    },
  });
}

/** Record an "add" operation (module added, reverse = delete files). */
export function recordAdd(
  projectRoot: string,
  description: string,
  addedFiles: string[],
): void {
  pushEntry(projectRoot, {
    id: generateEntryId(),
    timestamp: new Date().toISOString(),
    operation: "add",
    description,
    reverse: {
      type: "delete-files",
      files: addedFiles,
    },
  });
}

/** Record a "remove" operation (module removed, reverse = restore files). */
export function recordRemove(
  projectRoot: string,
  description: string,
  removedFiles: Array<{ path: string; content: string }>,
): void {
  pushEntry(projectRoot, {
    id: generateEntryId(),
    timestamp: new Date().toISOString(),
    operation: "remove",
    description,
    reverse: {
      type: "restore-files",
      restoreData: removedFiles,
    },
  });
}

// ---------------------------------------------------------------------------
// Execute Undo
// ---------------------------------------------------------------------------

/** Execute the reverse action for an undo entry. Returns files affected. */
export function executeUndo(
  projectRoot: string,
  entry: UndoEntry,
): string[] {
  const affected: string[] = [];

  switch (entry.reverse.type) {
    case "delete-files": {
      const files = entry.reverse.files ?? [];
      for (const file of files) {
        const fullPath = join(projectRoot, file);
        if (existsSync(fullPath)) {
          rmSync(fullPath, { recursive: true, force: true });
          affected.push(file);
        }
      }
      break;
    }
    case "restore-files": {
      const restoreData = entry.reverse.restoreData ?? [];
      for (const item of restoreData) {
        const fullPath = join(projectRoot, item.path);
        const dir = fullPath.substring(0, fullPath.lastIndexOf("/"));
        if (dir) {
          mkdirSync(dir, { recursive: true });
        }
        writeFileSync(fullPath, item.content, "utf-8");
        affected.push(item.path);
      }
      break;
    }
    case "run-command": {
      // Command execution is intentionally not implemented for safety.
      // Only file-based undo is supported.
      break;
    }
  }

  return affected;
}

// ---------------------------------------------------------------------------
// CLI Command
// ---------------------------------------------------------------------------

/**
 * `vibe undo` — Reverts the last CLI operation.
 */
export function undoCommand(): Command {
  const cmd = new Command("undo")
    .description("Revert the last CLI operation")
    .option("--list", "Show the undo stack without undoing")
    .option("--clear", "Clear the entire undo stack")
    .option("--json", "Output as JSON")
    .action(
      async (options: { list?: boolean; clear?: boolean; json?: boolean }) => {
        const fmt = createFormatter();
        const projectRoot = process.cwd();

        if (options.clear) {
          clearStack(projectRoot);
          fmt.success({
            command: "undo",
            data: { cleared: true },
            message: chalk.green("Undo stack cleared."),
          });
          return;
        }

        if (options.list) {
          const stack = loadStack(projectRoot);
          if (stack.entries.length === 0) {
            fmt.info("Undo stack is empty. Nothing to undo.");
            return;
          }

          if (options.json) {
            console.log(JSON.stringify(stack.entries, null, 2));
            return;
          }

          fmt.info(
            chalk.bold(`Undo stack (${stack.entries.length} operations):\n`),
          );
          for (let i = stack.entries.length - 1; i >= 0; i--) {
            const e = stack.entries[i]!;
            const idx = stack.entries.length - i;
            console.log(
              `  ${chalk.dim(`${idx}.`)} ${chalk.cyan(e.operation)} — ${e.description}`,
            );
            console.log(
              `     ${chalk.dim(e.timestamp)} ${chalk.dim(`[${e.reverse.type}]`)}`,
            );
          }
          console.log();
          return;
        }

        // Default: undo the last operation
        const entry = popEntry(projectRoot);
        if (!entry) {
          fmt.info("Nothing to undo. Stack is empty.");
          return;
        }

        fmt.info(
          `Undoing: ${chalk.cyan(entry.operation)} — ${entry.description}`,
        );

        const affected = executeUndo(projectRoot, entry);

        fmt.success({
          command: "undo",
          data: { undone: entry.description, filesAffected: affected },
          message: chalk.green(
            `Undone: ${entry.description} (${affected.length} files affected)`,
          ),
        });
      },
    );

  return cmd;
}
