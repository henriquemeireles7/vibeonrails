/**
 * Template Loader
 *
 * Loads and compiles Handlebars prompt templates.
 * Checks for user overrides in the project before falling back to built-in templates.
 */

import Handlebars from 'handlebars';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ModuleContext, ExportInfo } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Available prompt template names. */
export type TemplateName = 'guide-overview' | 'guide-detail' | 'reference' | 'tutorial';

/** Context passed to the guide-overview template. */
export interface GuideOverviewContext {
  moduleName: string;
  packageName: string;
  importPath: string;
  skillContent?: string;
  exports: ExportInfo[];
  submodules: string[];
}

/** Context passed to the guide-detail template. */
export interface GuideDetailContext {
  moduleName: string;
  packageName: string;
  importPath: string;
  pageTopic: string;
  pageTitle: string;
  sidebarOrder: number;
  skillContent?: string;
  focusExports: ExportInfo[];
  allExports: ExportInfo[];
}

/** Context passed to the reference template. */
export interface ReferenceContext {
  exportName: string;
  exportKind: string;
  packageName: string;
  importPath: string;
  signature: string;
  jsdoc?: string;
  params?: ExportInfo['params'];
  returnType?: string;
  sourceFile: string;
  sidebarOrder: number;
}

/** Context passed to the tutorial template. */
export interface TutorialContext {
  tutorialTitle: string;
  sidebarOrder: number;
  modules: Array<{
    packageName: string;
    moduleName: string;
    importPath: string;
    skillContent?: string;
    exports: ExportInfo[];
  }>;
}

/** All possible template contexts. */
export type TemplateContext =
  | GuideOverviewContext
  | GuideDetailContext
  | ReferenceContext
  | TutorialContext;

/**
 * Load and compile a prompt template.
 *
 * Resolution order:
 * 1. User override at {projectRoot}/docs/templates/prompts/{name}.hbs
 * 2. Built-in template at packages/docs/templates/prompts/{name}.hbs
 *
 * @param name - Template name (without .hbs extension)
 * @param projectRoot - Project root for checking user overrides
 * @returns Compiled Handlebars template function
 */
export function loadTemplate(
  name: TemplateName,
  projectRoot?: string,
): HandlebarsTemplateDelegate {
  const filename = `${name}.hbs`;

  // Check for user override first
  if (projectRoot) {
    const overridePath = join(projectRoot, 'docs', 'templates', 'prompts', filename);
    if (existsSync(overridePath)) {
      const source = readFileSync(overridePath, 'utf-8');
      return Handlebars.compile(source);
    }
  }

  // Fall back to built-in template
  const builtinPath = resolveBuiltinTemplatePath(filename);
  const source = readFileSync(builtinPath, 'utf-8');
  return Handlebars.compile(source);
}

/**
 * Render a prompt template with the given context.
 *
 * @param name - Template name
 * @param context - Data to fill into the template
 * @param projectRoot - Project root for checking user overrides
 * @returns Rendered prompt string
 */
export function renderPrompt(
  name: TemplateName,
  context: TemplateContext,
  projectRoot?: string,
): string {
  const template = loadTemplate(name, projectRoot);
  return template(context);
}

/**
 * Build the import path for a module.
 * E.g., "@vibeonrails/core" + "database" -> "@vibeonrails/core/database"
 */
export function buildImportPath(packageName: string, moduleName: string): string {
  return `${packageName}/${moduleName}`;
}

/**
 * Build a GuideOverviewContext from a ModuleContext.
 */
export function buildGuideOverviewContext(
  module: ModuleContext,
  packageName: string,
): GuideOverviewContext {
  return {
    moduleName: module.name,
    packageName,
    importPath: buildImportPath(packageName, module.name),
    skillContent: module.skillContent,
    exports: module.exports,
    submodules: module.submodules,
  };
}

/**
 * Build a GuideDetailContext for a specific submodule or topic.
 */
export function buildGuideDetailContext(
  module: ModuleContext,
  packageName: string,
  pageTopic: string,
  pageTitle: string,
  sidebarOrder: number,
  focusExports: ExportInfo[],
): GuideDetailContext {
  return {
    moduleName: module.name,
    packageName,
    importPath: buildImportPath(packageName, module.name),
    pageTopic,
    pageTitle,
    sidebarOrder,
    skillContent: module.skillContent,
    focusExports,
    allExports: module.exports,
  };
}

/**
 * Build a ReferenceContext for a specific export.
 */
export function buildReferenceContext(
  exp: ExportInfo,
  packageName: string,
  moduleName: string,
  sidebarOrder: number,
): ReferenceContext {
  return {
    exportName: exp.name,
    exportKind: exp.kind,
    packageName,
    importPath: buildImportPath(packageName, moduleName),
    signature: exp.signature,
    jsdoc: exp.jsdoc,
    params: exp.params,
    returnType: exp.returnType,
    sourceFile: exp.sourceFile,
    sidebarOrder,
  };
}

/**
 * Resolve the path to a built-in template file.
 */
function resolveBuiltinTemplatePath(filename: string): string {
  // When running from source (development): relative to this file
  // packages/docs/src/generator/templates.ts -> packages/docs/templates/prompts/
  const fromSource = join(__dirname, '..', '..', 'templates', 'prompts', filename);
  if (existsSync(fromSource)) return fromSource;

  // When running from dist (production): dist/generator/ -> templates/prompts/
  const fromDist = join(__dirname, '..', '..', '..', 'templates', 'prompts', filename);
  if (existsSync(fromDist)) return fromDist;

  throw new Error(
    `[AOR] Template "${filename}" not found.\n` +
    `  Searched: ${fromSource}\n` +
    `  Searched: ${fromDist}`,
  );
}
