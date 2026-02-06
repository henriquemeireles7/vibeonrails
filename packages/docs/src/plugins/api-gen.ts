/**
 * Remark plugin: API Reference Generator.
 *
 * When a markdown file contains a directive like:
 *   {/* api: createServer from @vibeonrails/core/api *\/}
 *
 * This plugin generates a basic API reference section from the
 * package's TypeScript type declarations (.d.ts files).
 *
 * For the initial version, this plugin provides a lightweight
 * structure that can be enhanced with TypeScript compiler API
 * integration in later iterations.
 */

import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root, Text, Heading, Paragraph, Code } from 'mdast';

export interface ApiGenOptions {
  /** Base directory for package resolution. */
  basePath?: string;
}

/** Parsed API directive. */
export interface ApiDirective {
  /** Export name (e.g. "createServer"). */
  exportName: string;
  /** Package path (e.g. "@vibeonrails/core/api"). */
  packagePath: string;
}

/**
 * Parse an `api:` directive string.
 *
 * @param value - Raw directive text (e.g. "api: createServer from @vibeonrails/core/api")
 * @returns Parsed directive or null if invalid
 */
export function parseApiDirective(value: string): ApiDirective | null {
  const match = value.match(/^api:\s*(\w+)\s+from\s+(.+)$/);
  if (!match?.[1] || !match[2]) return null;

  return {
    exportName: match[1],
    packagePath: match[2].trim(),
  };
}

/**
 * Generate markdown AST nodes for an API reference placeholder.
 *
 * In the initial version, this creates a structured placeholder
 * that documents the export location. Future versions will parse
 * actual .d.ts files for full type information.
 *
 * @param directive - Parsed API directive
 * @returns Array of mdast nodes
 */
export function generateApiNodes(
  directive: ApiDirective,
): Array<Heading | Paragraph | Code> {
  const heading: Heading = {
    type: 'heading',
    depth: 3,
    children: [{ type: 'text', value: directive.exportName }],
  };

  const importInfo: Paragraph = {
    type: 'paragraph',
    children: [
      {
        type: 'text',
        value: `Import from `,
      },
      {
        type: 'inlineCode',
        value: directive.packagePath,
      } as unknown as Text,
    ],
  };

  const codeBlock: Code = {
    type: 'code',
    lang: 'typescript',
    value: `import { ${directive.exportName} } from '${directive.packagePath}';`,
  };

  return [heading, importInfo, codeBlock];
}

/**
 * Remark plugin that replaces `api:` directives with API reference content.
 *
 * Looks for text nodes matching the pattern `api: <name> from <package>`
 * and replaces them with auto-generated API documentation.
 */
export const remarkApiGen: Plugin<[ApiGenOptions?], Root> = (
  _options: ApiGenOptions = {},
) => {
  return (tree: Root) => {
    visit(tree, 'text', (node: Text, index: number | undefined, parent: unknown) => {
      const directive = parseApiDirective(node.value);
      if (!directive || index === undefined || !parent) return;

      const nodes = generateApiNodes(directive);
      const parentNode = parent as { children: unknown[] };

      // Replace current node with generated nodes
      parentNode.children.splice(index, 1, ...nodes);
    });
  };
};
