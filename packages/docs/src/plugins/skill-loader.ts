/**
 * Remark plugin: SKILL.md Loader.
 *
 * When a markdown file contains an HTML comment directive like:
 *   {/* skill: @vibeonrails/core/database *\/}
 *
 * This plugin resolves the SKILL.md file from that package path and
 * injects its content into the document as a blockquote callout.
 *
 * This enables documentation pages to automatically include the
 * "AI-readable" skill descriptions alongside human documentation.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Paragraph, Text, Blockquote } from 'mdast';

export interface SkillLoaderOptions {
  /** Base directory to resolve package paths from (default: process.cwd()). */
  basePath?: string;
  /** Directories to search for SKILL.md files. */
  searchPaths?: string[];
}

/**
 * Resolve SKILL.md file content from a package reference.
 *
 * @param ref - Package reference (e.g. "@vibeonrails/core/database")
 * @param basePath - Base path to resolve from
 * @param searchPaths - Additional paths to search
 * @returns Content string, or null if not found
 */
export function resolveSkillContent(
  ref: string,
  basePath: string,
  searchPaths: string[] = [],
): string | null {
  // Try node_modules first
  const nodeModulePath = join(basePath, 'node_modules', ref, 'SKILL.md');
  if (existsSync(nodeModulePath)) {
    return readFileSync(nodeModulePath, 'utf-8');
  }

  // Try packages/ directory (monorepo)
  const packageName = ref.replace('@vibeonrails/', '');
  const parts = packageName.split('/');
  const pkgDir = parts[0] ?? packageName;
  const subDir = parts.slice(1).join('/');

  const monorepoPath = subDir
    ? join(basePath, 'packages', pkgDir, 'src', subDir, 'SKILL.md')
    : join(basePath, 'packages', pkgDir, 'SKILL.md');

  if (existsSync(monorepoPath)) {
    return readFileSync(monorepoPath, 'utf-8');
  }

  // Try search paths
  for (const searchPath of searchPaths) {
    const fullPath = join(searchPath, ref, 'SKILL.md');
    if (existsSync(fullPath)) {
      return readFileSync(fullPath, 'utf-8');
    }
  }

  return null;
}

/**
 * Remark plugin that replaces `skill:` directives with SKILL.md content.
 *
 * Looks for text nodes matching the pattern `skill: <package-reference>`
 * and replaces them with the content of the referenced SKILL.md file.
 */
export const remarkSkillLoader: Plugin<[SkillLoaderOptions?], Root> = (
  options: SkillLoaderOptions = {},
) => {
  const basePath = options.basePath ?? process.cwd();
  const searchPaths = options.searchPaths ?? [];

  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: unknown) => {
      const match = node.value.match(/^skill:\s*(.+)$/);
      if (!match?.[1]) return;

      const ref = match[1].trim();
      const content = resolveSkillContent(ref, basePath, searchPaths);

      if (!content || index === undefined || !parent) return;

      // Create a blockquote with the skill content
      const textNode: Text = {
        type: 'text',
        value: `SKILL.md: ${ref}\n\n${content}`,
      };

      const paragraph: Paragraph = {
        type: 'paragraph',
        children: [textNode],
      };

      const blockquote: Blockquote = {
        type: 'blockquote',
        children: [paragraph],
      };

      // Replace the text node's parent with the blockquote
      const parentNode = parent as { children: unknown[] };
      parentNode.children[index] = blockquote;
    });
  };
};
