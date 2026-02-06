/**
 * AI Documentation Generator — Shared Type Definitions
 *
 * Types used across the extractor, generator, validator, and orchestrator.
 */

/** Information about a single exported symbol from a TypeScript module. */
export interface ExportInfo {
  /** Export name (e.g., "createDatabase", "User") */
  name: string;
  /** Kind of export */
  kind: 'function' | 'class' | 'type' | 'interface' | 'const' | 'enum';
  /** Full TypeScript signature */
  signature: string;
  /** JSDoc comment block (if present) */
  jsdoc?: string;
  /** Parsed parameters (for functions/methods) */
  params?: ParamInfo[];
  /** Return type string (for functions) */
  returnType?: string;
  /** Relative source file path */
  sourceFile: string;
}

/** Parsed parameter information for a function export. */
export interface ParamInfo {
  /** Parameter name */
  name: string;
  /** TypeScript type string */
  type: string;
  /** Whether the parameter is required */
  required: boolean;
  /** Default value (if any) */
  defaultValue?: string;
  /** JSDoc @param description (if any) */
  description?: string;
}

/** Context extracted from a single module (e.g., "database", "api"). */
export interface ModuleContext {
  /** Module name (e.g., "database", "api", "security") */
  name: string;
  /** Absolute path to the module directory */
  path: string;
  /** Contents of SKILL.md if present in the module */
  skillContent?: string;
  /** All public exports from this module */
  exports: ExportInfo[];
  /** Submodule directory names (e.g., ["schema", "repositories", "seeds"]) */
  submodules: string[];
}

/** Context extracted from an entire package (e.g., "@vibeonrails/core"). */
export interface PackageContext {
  /** Package name (e.g., "@vibeonrails/core") */
  name: string;
  /** Absolute path to the package root */
  path: string;
  /** Contents of the package-level SKILL.md */
  skillContent?: string;
  /** All modules within the package */
  modules: ModuleContext[];
}

/** Supported documentation page types. */
export type DocType = 'guide' | 'reference' | 'tutorial';

/** Options for the generate() orchestrator. */
export interface GenerateOptions {
  /** Root directory of the project (default: process.cwd()) */
  rootDir?: string;
  /** Filter to specific packages (e.g., ["core", "infra"]) */
  packages?: string[];
  /** Filter to specific doc types (default: all) */
  types?: DocType[];
  /** Regenerate a single page path (e.g., "guides/database/schema") */
  page?: string;
  /** Preview what would be generated without writing files */
  dryRun?: boolean;
  /** Overwrite existing files (default: false — skip files that already exist) */
  force?: boolean;
  /** Output directory for generated MDX files */
  outputDir?: string;
  /** Anthropic model to use */
  model?: string;
  /** Progress callback */
  onProgress?: (event: ProgressEvent) => void;
}

/** Progress event emitted during generation. */
export interface ProgressEvent {
  phase: 'extracting' | 'generating' | 'validating' | 'writing';
  current: number;
  total: number;
  message: string;
}

/** A page to be generated. */
export interface PageSpec {
  /** Output file path relative to outputDir (e.g., "guides/database/schema.mdx") */
  outputPath: string;
  /** Doc type */
  type: DocType;
  /** Template name to use (e.g., "guide-overview", "guide-detail", "reference") */
  template: string;
  /** The module context this page documents */
  module: ModuleContext;
  /** The package this module belongs to */
  packageName: string;
  /** Specific exports to focus on (for reference pages) */
  focusExports?: ExportInfo[];
}

/** Result of validating a generated page. */
export interface ValidationResult {
  /** Whether the page is valid (warnings don't block) */
  valid: boolean;
  /** Validation warnings */
  warnings: string[];
  /** Validation errors (blocking) */
  errors: string[];
}

/** Result of the full generation run. */
export interface GenerateResult {
  /** Pages that were successfully generated */
  pagesGenerated: string[];
  /** Pages that were skipped (already exist, no --force) */
  pagesSkipped: string[];
  /** Pages that failed */
  pagesFailed: string[];
  /** All validation warnings across all pages */
  warnings: string[];
  /** Total time in milliseconds */
  durationMs: number;
}
