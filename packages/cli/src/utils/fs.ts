import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  copyFileSync,
} from "node:fs";
import { join } from "node:path";

/** Create a directory (and all parents) if it does not exist. */
export function ensureDir(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true });
}

/** Replace all occurrences of `search` with `replace` in a file (in-place). */
export function replaceInFile(
  filePath: string,
  search: string,
  replace: string,
): void {
  const content = readFileSync(filePath, "utf-8");
  const updated = content.replaceAll(search, replace);
  writeFileSync(filePath, updated, "utf-8");
}

/** Recursively copy a directory from `src` to `dest`. */
export function copyDir(src: string, dest: string): void {
  ensureDir(dest);

  const entries = readdirSync(src);
  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/** Check if a path exists. */
export function pathExists(filePath: string): boolean {
  return existsSync(filePath);
}

/** Read a file as a UTF-8 string. */
export function readFile(filePath: string): string {
  return readFileSync(filePath, "utf-8");
}

/** Write a string to a file (creates parent dirs). */
export function writeFile(filePath: string, content: string): void {
  const dir = filePath.substring(0, filePath.lastIndexOf("/"));
  if (dir) {
    ensureDir(dir);
  }
  writeFileSync(filePath, content, "utf-8");
}
