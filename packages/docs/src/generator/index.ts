/**
 * AI Documentation Generator — Orchestrator
 *
 * Main entry point that ties together the extractor, templates, generator,
 * and validator into a single `generate()` function.
 *
 * Usage:
 *   import { generate } from '@vibeonrails/docs/generator';
 *   await generate({ rootDir: '/path/to/project' });
 */

import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { extractAllPackages } from './extractor.js';
import { createAIClient, generatePage } from './generator.js';
import { validateGeneratedPage } from './validator.js';
import {
  buildGuideOverviewContext,
  buildGuideDetailContext,
  buildReferenceContext,
  buildImportPath,
} from './templates.js';
import type { TemplateContext, TutorialContext } from './templates.js';
import type {
  GenerateOptions,
  GenerateResult,
  PackageContext,
  PageSpec,
  ModuleContext,
} from './types.js';

// Re-export all public APIs
export { extractAllPackages, extractPackageContext, readSkillMd } from './extractor.js';
export { generatePage, generatePages, createAIClient } from './generator.js';
export {
  validateGeneratedPage,
  validateFrontmatter,
  validateImportPaths,
  validateExportReferences,
  validateQuality,
  cleanGeneratedContent,
} from './validator.js';
export {
  loadTemplate,
  renderPrompt,
  buildImportPath,
  buildGuideOverviewContext,
  buildGuideDetailContext,
  buildReferenceContext,
} from './templates.js';
export type * from './types.js';
export type * from './templates.js';

/**
 * Generate documentation pages for a VibeonRails project.
 *
 * This is the main orchestration function that:
 * 1. Extracts context from all packages (SKILL.md, TS exports, JSDoc)
 * 2. Plans which pages to generate
 * 3. Sends prompts to Claude for each page
 * 4. Validates the generated content
 * 5. Writes MDX files to the output directory
 *
 * @param options - Generation options
 * @returns Result summary
 */
export async function generate(options: GenerateOptions = {}): Promise<GenerateResult> {
  // Verify optional dependencies are installed before proceeding
  assertGeneratorDeps();

  const startTime = Date.now();
  const rootDir = options.rootDir ?? process.cwd();
  const outputDir = options.outputDir ?? join(rootDir, 'docs', 'src', 'content', 'docs');
  const onProgress = options.onProgress;

  const pagesGenerated: string[] = [];
  const pagesFailed: string[] = [];
  const allWarnings: string[] = [];

  // Phase 1: Extract
  onProgress?.({ phase: 'extracting', current: 0, total: 0, message: 'Scanning packages...' });
  const packages = extractAllPackages(rootDir, options.packages);

  if (packages.length === 0) {
    return {
      pagesGenerated: [],
      pagesSkipped: [],
      pagesFailed: [],
      warnings: ['No packages found to document'],
      durationMs: Date.now() - startTime,
    };
  }

  const packageNames = packages.map((p) => p.name);

  onProgress?.({
    phase: 'extracting',
    current: packages.length,
    total: packages.length,
    message: `Found ${packages.length} packages with ${packages.reduce((sum, p) => sum + p.modules.length, 0)} modules`,
  });

  // Phase 2: Plan pages
  const pageSpecs = planPages(packages, options);

  if (pageSpecs.length === 0) {
    return {
      pagesGenerated: [],
      pagesSkipped: [],
      pagesFailed: [],
      warnings: ['No pages to generate (filters too restrictive?)'],
      durationMs: Date.now() - startTime,
    };
  }

  // Phase 3: Generate
  // Only create the AI client when we actually need it (not for dry runs)
  const client = options.dryRun ? null : createAIClient();
  const pagesSkipped: string[] = [];

  for (let i = 0; i < pageSpecs.length; i++) {
    const spec = pageSpecs[i]!;
    const outputPath = join(outputDir, spec.outputPath);

    // Skip existing files unless --force is set
    if (!options.force && existsSync(outputPath)) {
      pagesSkipped.push(spec.outputPath);
      onProgress?.({
        phase: 'generating',
        current: i + 1,
        total: pageSpecs.length,
        message: `${spec.outputPath} (skipped — already exists)`,
      });
      continue;
    }

    onProgress?.({
      phase: 'generating',
      current: i + 1,
      total: pageSpecs.length,
      message: spec.outputPath,
    });

    if (options.dryRun) {
      pagesGenerated.push(spec.outputPath);
      continue;
    }

    try {
      // Build template context
      const templateContext = buildTemplateContext(spec, packages);

      // Generate content via Claude
      const rawContent = await generatePage(client!, {
        template: spec.template as 'guide-overview' | 'guide-detail' | 'reference' | 'tutorial',
        context: templateContext,
        model: options.model,
        projectRoot: rootDir,
      });

      // Validate
      onProgress?.({
        phase: 'validating',
        current: i + 1,
        total: pageSpecs.length,
        message: spec.outputPath,
      });

      const validation = validateGeneratedPage(rawContent, spec.module.exports, packageNames);
      allWarnings.push(...validation.warnings.map((w) => `${spec.outputPath}: ${w}`));

      if (!validation.valid) {
        pagesFailed.push(spec.outputPath);
        allWarnings.push(...validation.errors.map((e) => `${spec.outputPath}: ERROR: ${e}`));
        continue;
      }

      // Write file
      onProgress?.({
        phase: 'writing',
        current: i + 1,
        total: pageSpecs.length,
        message: spec.outputPath,
      });

      const dir = dirname(outputPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(outputPath, rawContent, 'utf-8');

      pagesGenerated.push(spec.outputPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      pagesFailed.push(spec.outputPath);
      allWarnings.push(`${spec.outputPath}: Generation failed: ${message}`);
    }

    // Rate limiting pause between API calls
    if (!options.dryRun && i < pageSpecs.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  if (pagesSkipped.length > 0) {
    allWarnings.push(`Skipped ${pagesSkipped.length} existing page(s). Use --force to overwrite.`);
  }

  return {
    pagesGenerated,
    pagesSkipped,
    pagesFailed,
    warnings: allWarnings,
    durationMs: Date.now() - startTime,
  };
}

/**
 * Plan which pages to generate based on extracted packages and options.
 */
export function planPages(
  packages: PackageContext[],
  options: GenerateOptions = {},
): PageSpec[] {
  const specs: PageSpec[] = [];
  const types = options.types ?? ['guide', 'reference'];

  for (const pkg of packages) {
    for (const mod of pkg.modules) {
      const moduleDir = `guides/${toKebab(mod.name)}`;

      // Guide overview page
      if (types.includes('guide')) {
        if (!options.page || options.page === `${moduleDir}/index`) {
          specs.push({
            outputPath: `${moduleDir}/index.mdx`,
            type: 'guide',
            template: 'guide-overview',
            module: mod,
            packageName: pkg.name,
          });
        }

        // Guide detail pages (one per submodule)
        for (let i = 0; i < mod.submodules.length; i++) {
          const sub = mod.submodules[i]!;
          const pagePath = `${moduleDir}/${toKebab(sub)}`;

          if (options.page && options.page !== pagePath) continue;

          // Find exports related to this submodule
          const focusExports = mod.exports.filter((e) =>
            e.sourceFile.includes(`/${sub}/`) || e.sourceFile.includes(`/${sub}.`),
          );

          specs.push({
            outputPath: `${pagePath}.mdx`,
            type: 'guide',
            template: 'guide-detail',
            module: mod,
            packageName: pkg.name,
            focusExports: focusExports.length > 0 ? focusExports : mod.exports,
          });
        }
      }

      // Reference pages (one per exported function/class)
      if (types.includes('reference')) {
        const refExports = mod.exports.filter((e) =>
          e.kind === 'function' || e.kind === 'class',
        );

        for (let i = 0; i < refExports.length; i++) {
          const exp = refExports[i]!;
          const pagePath = `reference/${toKebab(mod.name)}/${toKebab(exp.name)}`;

          if (options.page && options.page !== pagePath) continue;

          specs.push({
            outputPath: `${pagePath}.mdx`,
            type: 'reference',
            template: 'reference',
            module: mod,
            packageName: pkg.name,
            focusExports: [exp],
          });
        }
      }
    }
  }

  // Tutorial pages (one per package, combining all modules)
  if (types.includes('tutorial')) {
    for (const pkg of packages) {
      if (pkg.modules.length === 0) continue;

      const shortName = pkg.name.replace('@vibeonrails/', '');
      const pagePath = `tutorials/${toKebab(shortName)}`;

      if (options.page && options.page !== pagePath) continue;

      // Use the first module as the "primary" for the PageSpec
      const primaryModule = pkg.modules[0]!;

      specs.push({
        outputPath: `${pagePath}.mdx`,
        type: 'tutorial',
        template: 'tutorial',
        module: primaryModule,
        packageName: pkg.name,
      });
    }
  }

  return specs;
}

/**
 * Build the correct template context for a page spec.
 */
function buildTemplateContext(spec: PageSpec, packages: PackageContext[]): TemplateContext {
  switch (spec.template) {
    case 'guide-overview':
      return buildGuideOverviewContext(spec.module, spec.packageName);

    case 'guide-detail':
      return buildGuideDetailContext(
        spec.module,
        spec.packageName,
        spec.focusExports?.[0]?.name ?? spec.module.name,
        formatTitle(spec.outputPath),
        extractSidebarOrder(spec.outputPath),
        spec.focusExports ?? spec.module.exports,
      );

    case 'reference': {
      const exp = spec.focusExports?.[0];
      if (!exp) throw new Error(`No export specified for reference page: ${spec.outputPath}`);
      return buildReferenceContext(
        exp,
        spec.packageName,
        spec.module.name,
        extractSidebarOrder(spec.outputPath),
      );
    }

    case 'tutorial': {
      // Find the full package to get all modules
      const pkg = packages.find((p) => p.name === spec.packageName);
      const modules = pkg?.modules ?? [spec.module];
      return buildTutorialContext(spec.packageName, modules, extractSidebarOrder(spec.outputPath));
    }

    default:
      return buildGuideOverviewContext(spec.module, spec.packageName);
  }
}

/**
 * Build a TutorialContext from a package's modules.
 */
function buildTutorialContext(
  packageName: string,
  modules: ModuleContext[],
  sidebarOrder: number,
): TutorialContext {
  const shortName = packageName.replace('@vibeonrails/', '');
  return {
    tutorialTitle: `Building with ${shortName}`,
    sidebarOrder,
    modules: modules.map((mod) => ({
      packageName,
      moduleName: mod.name,
      importPath: buildImportPath(packageName, mod.name),
      skillContent: mod.skillContent,
      exports: mod.exports.filter((e) => e.kind === 'function' || e.kind === 'class'),
    })),
  };
}

/**
 * Verify that optional generator dependencies (ts-morph, @anthropic-ai/sdk, handlebars)
 * are installed. These are optionalDependencies of @vibeonrails/docs so they won't be
 * present for users who only use the presets/components/plugins.
 *
 * Uses import.meta.resolve (ESM-compatible) to check without actually loading.
 */
function assertGeneratorDeps(): void {
  const missing: string[] = [];
  const deps = ['ts-morph', '@anthropic-ai/sdk', 'handlebars'];

  for (const dep of deps) {
    try {
      import.meta.resolve(dep);
    } catch {
      missing.push(dep);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `[AOR] Missing dependencies for docs generator: ${missing.join(', ')}\n` +
      `  These are optional dependencies of @vibeonrails/docs.\n` +
      `  Install them: pnpm add ${missing.join(' ')}`,
    );
  }
}

/**
 * Convert a string to kebab-case.
 */
function toKebab(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[_\s]+/g, '-')
    .toLowerCase();
}

/**
 * Extract a readable title from a file path.
 */
function formatTitle(outputPath: string): string {
  const name = outputPath.replace(/\.mdx$/, '').split('/').pop() ?? '';
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Derive sidebar order from the output path position.
 */
function extractSidebarOrder(outputPath: string): number {
  if (outputPath.endsWith('index.mdx')) return 1;
  // Default to a reasonable order
  return 5;
}
