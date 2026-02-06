/**
 * Content Test Helpers
 *
 * Create temporary content directories with markdown files for testing.
 */

import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";

/**
 * Content file definition.
 */
export interface ContentFileSpec {
  readonly title?: string;
  readonly content: string;
  readonly frontmatter?: Record<string, unknown>;
}

/**
 * Create a temporary content directory with files.
 */
export function createTempContent(
  files: Record<string, ContentFileSpec>,
): string {
  const dir = join(
    tmpdir(),
    `vibe-test-content-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });

  for (const [path, spec] of Object.entries(files)) {
    const fullPath = join(dir, path);
    mkdirSync(dirname(fullPath), { recursive: true });

    const fm: Record<string, unknown> = {
      ...spec.frontmatter,
    };
    if (spec.title) {
      fm["title"] = spec.title;
    }

    let content = "";
    if (Object.keys(fm).length > 0) {
      const fmLines = Object.entries(fm).map(
        ([k, v]) => `${k}: ${JSON.stringify(v)}`,
      );
      content = `---\n${fmLines.join("\n")}\n---\n\n`;
    }
    content += spec.content;

    writeFileSync(fullPath, content, "utf-8");
  }

  return dir;
}

/**
 * Create a single markdown file.
 */
export function createMarkdownFile(
  dir: string,
  filename: string,
  content: string,
  frontmatter?: Record<string, unknown>,
): string {
  const fullPath = join(dir, filename);
  mkdirSync(dirname(fullPath), { recursive: true });

  let md = "";
  if (frontmatter && Object.keys(frontmatter).length > 0) {
    const fmLines = Object.entries(frontmatter).map(
      ([k, v]) => `${k}: ${JSON.stringify(v)}`,
    );
    md = `---\n${fmLines.join("\n")}\n---\n\n`;
  }
  md += content;

  writeFileSync(fullPath, md, "utf-8");
  return fullPath;
}

/**
 * Clean up a temporary content directory.
 */
export function cleanupTempContent(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}
