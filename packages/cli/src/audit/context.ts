/**
 * Audit Context Builder
 *
 * Builds the context object that all checkers receive.
 * Lazy-loads file contents with caching for performance.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import type { AuditContext } from "./types.js";

const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  ".next",
  ".turbo",
  "coverage",
  ".git",
  ".vibe",
  ".cache",
  "build",
  "out",
]);

const SOURCE_EXT = /\.(ts|tsx|js|jsx)$/;
const TEST_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;

function walkDir(dir: string, base: string): string[] {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    let stat;
    try {
      stat = statSync(fullPath);
    } catch {
      continue;
    }

    if (stat.isDirectory()) {
      results.push(...walkDir(fullPath, base));
    } else {
      results.push(relative(base, fullPath));
    }
  }

  return results;
}

export async function buildAuditContext(
  projectRoot: string,
): Promise<AuditContext> {
  const allFiles = walkDir(projectRoot, projectRoot);

  const sourceFiles = allFiles.filter(
    (f) => SOURCE_EXT.test(f) && !TEST_PATTERN.test(f),
  );

  const testFiles = allFiles.filter((f) => TEST_PATTERN.test(f));

  const fileCache = new Map<string, string>();

  const readFile = (relativePath: string): string => {
    if (fileCache.has(relativePath)) return fileCache.get(relativePath)!;
    try {
      const content = readFileSync(
        join(projectRoot, relativePath),
        "utf-8",
      );
      fileCache.set(relativePath, content);
      return content;
    } catch {
      return "";
    }
  };

  const fileExistsCheck = (relativePath: string): boolean => {
    if (allFiles.includes(relativePath)) return true;
    return existsSync(join(projectRoot, relativePath));
  };

  const fileLines = (relativePath: string): string[] => {
    return readFile(relativePath).split("\n");
  };

  let packageJson: Record<string, unknown> | null = null;
  try {
    const raw = readFile("package.json");
    if (raw) packageJson = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    packageJson = null;
  }

  return {
    projectRoot,
    sourceFiles,
    testFiles,
    allFiles,
    readFile,
    fileExists: fileExistsCheck,
    fileLines,
    packageJson,
  };
}
