/**
 * Custom Test Assertions
 *
 * Reusable assertion helpers for common VoR testing patterns.
 */

import { existsSync, readFileSync } from "node:fs";

/**
 * Assert that a file exists at the given path.
 */
export function assertFileExists(path: string): void {
  if (!existsSync(path)) {
    throw new Error(`Expected file to exist: ${path}`);
  }
}

/**
 * Assert that a file does not exist at the given path.
 */
export function assertFileNotExists(path: string): void {
  if (existsSync(path)) {
    throw new Error(`Expected file to NOT exist: ${path}`);
  }
}

/**
 * Assert that a file contains a specific string.
 */
export function assertFileContains(path: string, content: string): void {
  assertFileExists(path);
  const fileContent = readFileSync(path, "utf-8");
  if (!fileContent.includes(content)) {
    throw new Error(
      `Expected file ${path} to contain "${content}" but it doesn't.\nFile content: ${fileContent.substring(0, 200)}...`,
    );
  }
}

/**
 * Assert that a JSON file has a specific key-value pair.
 */
export function assertJsonHas(path: string, key: string, value: unknown): void {
  assertFileExists(path);
  const content = JSON.parse(readFileSync(path, "utf-8"));
  if (content[key] !== value) {
    throw new Error(
      `Expected ${path} to have "${key}": ${JSON.stringify(value)} but got ${JSON.stringify(content[key])}`,
    );
  }
}

/**
 * Assert that a markdown file has valid frontmatter.
 */
export function assertValidFrontmatter(path: string): void {
  assertFileExists(path);
  const content = readFileSync(path, "utf-8");
  if (!content.startsWith("---\n") || !content.includes("\n---\n")) {
    throw new Error(`Expected ${path} to have valid frontmatter`);
  }
}
