/**
 * Content Index Types
 *
 * Types and Zod schemas for the build-time content indexer.
 * Used to index markdown files with YAML frontmatter.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Frontmatter Schema
// ---------------------------------------------------------------------------

export const frontmatterSchema = z.object({
  title: z.string().optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  date: z.string().optional(),
  description: z.string().optional(),
});

export type Frontmatter = z.infer<typeof frontmatterSchema>;

// ---------------------------------------------------------------------------
// Content Entry
// ---------------------------------------------------------------------------

export interface ContentEntry {
  /** File path relative to content root */
  path: string;

  /** Title from frontmatter or filename */
  title: string;

  /** Content type (e.g., 'post', 'page', 'article') */
  type: string;

  /** Tags array */
  tags: string[];

  /** Publication date (ISO string) */
  date: string | null;

  /** Description from frontmatter */
  description: string | null;

  /** First 200 characters of content (snippet) */
  contentSnippet: string;

  /** File modification time (ISO string) */
  mtime: string;
}

// ---------------------------------------------------------------------------
// Content Index
// ---------------------------------------------------------------------------

export interface ContentIndex {
  /** Map of file path -> ContentEntry */
  entries: Record<string, ContentEntry>;

  /** Index generation timestamp */
  generatedAt: string;

  /** Content root directory */
  contentRoot: string;
}

// ---------------------------------------------------------------------------
// Index Configuration
// ---------------------------------------------------------------------------

export interface IndexConfig {
  /** Content root directory to scan */
  contentRoot: string;

  /** Output path for index JSON file */
  outputPath?: string;

  /** Whether to perform incremental indexing (check mtime) */
  incremental?: boolean;
}
