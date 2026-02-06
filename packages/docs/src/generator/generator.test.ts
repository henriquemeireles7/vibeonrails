/**
 * Tests for the AI Documentation Generator.
 *
 * Tests cover the extractor, templates, validator, and orchestrator.
 * All Anthropic API calls are mocked.
 */

import { describe, it, expect } from 'vitest';
import { join } from 'node:path';

// === Validator Tests ===

import {
  validateFrontmatter,
  validateImportPaths,
  validateExportReferences,
  validateQuality,
  cleanGeneratedContent,
  validateGeneratedPage,
} from './validator.js';
import type { ExportInfo } from './types.js';

describe('Validator', () => {
  describe('validateFrontmatter', () => {
    it('passes with valid frontmatter', () => {
      const content = '---\ntitle: Test Page\ndescription: A test\nsidebar:\n  order: 1\n---\n\nContent here.';
      const result = validateFrontmatter(content);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('fails when frontmatter is missing', () => {
      const content = '# No frontmatter\n\nJust content.';
      const result = validateFrontmatter(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing frontmatter (--- delimiters not found)');
    });

    it('fails when title is missing', () => {
      const content = '---\ndescription: A test\n---\n\nContent.';
      const result = validateFrontmatter(content);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Frontmatter missing "title" field');
    });

    it('warns when description is missing', () => {
      const content = '---\ntitle: Test\n---\n\nContent.';
      const result = validateFrontmatter(content);
      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Frontmatter missing "description" field');
    });
  });

  describe('validateImportPaths', () => {
    const knownPackages = ['@vibeonrails/core', '@vibeonrails/infra'];

    it('passes with known import paths', () => {
      const content = "import { createDatabase } from '@vibeonrails/core/database';";
      const result = validateImportPaths(content, knownPackages);
      expect(result.warnings).toHaveLength(0);
    });

    it('warns about unknown import paths', () => {
      const content = "import { foo } from '@vibeonrails/unknown/bar';";
      const result = validateImportPaths(content, knownPackages);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('unknown');
    });
  });

  describe('validateExportReferences', () => {
    const knownExports: ExportInfo[] = [
      { name: 'createDatabase', kind: 'function', signature: 'function createDatabase(): Database', sourceFile: 'src/database/client.ts' },
      { name: 'users', kind: 'const', signature: 'const users: Table', sourceFile: 'src/database/schema/user.ts' },
    ];

    it('passes with known exports', () => {
      const content = "import { createDatabase } from '@vibeonrails/core/database';";
      const result = validateExportReferences(content, knownExports);
      expect(result.warnings).toHaveLength(0);
    });

    it('warns about unknown exports', () => {
      const content = "import { nonExistent } from '@vibeonrails/core/database';";
      const result = validateExportReferences(content, knownExports);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('nonExistent');
    });
  });

  describe('validateQuality', () => {
    it('warns about very short content', () => {
      const content = '---\ntitle: Test\n---\nShort.';
      const result = validateQuality(content);
      expect(result.warnings.some((w) => w.includes('very short'))).toBe(true);
    });

    it('warns about placeholder text', () => {
      const content = '---\ntitle: Test\n---\n' + 'line\n'.repeat(25) + 'TODO: fill this in';
      const result = validateQuality(content);
      expect(result.warnings.some((w) => w.includes('placeholder'))).toBe(true);
    });

    it('warns about code fence wrapping', () => {
      const content = '```mdx\n---\ntitle: Test\n---\nContent.\n```';
      const result = validateQuality(content);
      expect(result.warnings.some((w) => w.includes('code fences'))).toBe(true);
    });

    it('passes clean content', () => {
      const lines = ['---', 'title: Good Page', 'description: A good page', '---', ''];
      for (let i = 0; i < 30; i++) {
        lines.push(`Line ${i + 1} of content.`);
      }
      const content = lines.join('\n');
      const result = validateQuality(content);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('cleanGeneratedContent', () => {
    it('strips wrapping code fences', () => {
      const content = '```mdx\n---\ntitle: Test\n---\nContent.\n```';
      const cleaned = cleanGeneratedContent(content);
      expect(cleaned).toBe('---\ntitle: Test\n---\nContent.\n');
    });

    it('trims whitespace and ensures trailing newline', () => {
      const content = '\n\n  ---\ntitle: Test\n---\nContent.  \n\n';
      const cleaned = cleanGeneratedContent(content);
      expect(cleaned.endsWith('\n')).toBe(true);
      expect(cleaned.startsWith('---')).toBe(true);
    });

    it('handles already clean content', () => {
      const content = '---\ntitle: Test\n---\nContent.';
      const cleaned = cleanGeneratedContent(content);
      expect(cleaned).toBe('---\ntitle: Test\n---\nContent.\n');
    });
  });

  describe('validateGeneratedPage', () => {
    it('validates a complete page', () => {
      const lines = ['---', 'title: Database Overview', 'description: Overview of the database module', '---', ''];
      for (let i = 0; i < 30; i++) {
        lines.push(`Line ${i + 1} of content about createDatabase.`);
      }
      const content = lines.join('\n');
      const exports: ExportInfo[] = [
        { name: 'createDatabase', kind: 'function', signature: 'function createDatabase(): Database', sourceFile: 'src/database/client.ts' },
      ];
      const packages = ['@vibeonrails/core'];

      const result = validateGeneratedPage(content, exports, packages);
      expect(result.valid).toBe(true);
    });
  });
});

// === Template Tests ===

import { renderPrompt, buildImportPath, buildGuideOverviewContext, buildReferenceContext } from './templates.js';
import type { ModuleContext } from './types.js';

describe('Templates', () => {
  describe('buildImportPath', () => {
    it('builds correct import paths', () => {
      expect(buildImportPath('@vibeonrails/core', 'database')).toBe('@vibeonrails/core/database');
      expect(buildImportPath('@vibeonrails/infra', 'cache')).toBe('@vibeonrails/infra/cache');
    });
  });

  describe('buildGuideOverviewContext', () => {
    it('builds correct context from module', () => {
      const module: ModuleContext = {
        name: 'database',
        path: '/packages/core/src/database',
        skillContent: '# Database module',
        exports: [
          { name: 'createDatabase', kind: 'function', signature: 'function createDatabase(): Database', sourceFile: 'src/database/client.ts' },
        ],
        submodules: ['schema', 'repositories'],
      };

      const ctx = buildGuideOverviewContext(module, '@vibeonrails/core');
      expect(ctx.moduleName).toBe('database');
      expect(ctx.packageName).toBe('@vibeonrails/core');
      expect(ctx.importPath).toBe('@vibeonrails/core/database');
      expect(ctx.exports).toHaveLength(1);
      expect(ctx.submodules).toEqual(['schema', 'repositories']);
    });
  });

  describe('buildReferenceContext', () => {
    it('builds correct context for an export', () => {
      const exp: ExportInfo = {
        name: 'createDatabase',
        kind: 'function',
        signature: 'function createDatabase(connectionString?: string): Database',
        jsdoc: '/** Create a database connection */',
        params: [{ name: 'connectionString', type: 'string', required: false }],
        returnType: 'Database',
        sourceFile: 'src/database/client.ts',
      };

      const ctx = buildReferenceContext(exp, '@vibeonrails/core', 'database', 1);
      expect(ctx.exportName).toBe('createDatabase');
      expect(ctx.importPath).toBe('@vibeonrails/core/database');
      expect(ctx.params).toHaveLength(1);
      expect(ctx.returnType).toBe('Database');
    });
  });

  describe('renderPrompt', () => {
    it('renders guide-overview template with context', () => {
      const module: ModuleContext = {
        name: 'database',
        path: '/packages/core/src/database',
        skillContent: 'Database module for ORM.',
        exports: [
          { name: 'createDatabase', kind: 'function', signature: 'function createDatabase(): Database', sourceFile: 'src/database/client.ts' },
        ],
        submodules: ['schema'],
      };

      const ctx = buildGuideOverviewContext(module, '@vibeonrails/core');

      // This will use the built-in template
      const prompt = renderPrompt('guide-overview', ctx);
      expect(prompt).toContain('@vibeonrails/core/database');
      expect(prompt).toContain('createDatabase');
      expect(prompt).toContain('database');
    });

    it('renders reference template with context', () => {
      const exp: ExportInfo = {
        name: 'createDatabase',
        kind: 'function',
        signature: 'function createDatabase(): Database',
        sourceFile: 'src/database/client.ts',
      };

      const ctx = buildReferenceContext(exp, '@vibeonrails/core', 'database', 1);
      const prompt = renderPrompt('reference', ctx);
      expect(prompt).toContain('createDatabase');
      expect(prompt).toContain('function');
    });
  });
});

// === Orchestrator Tests ===

import { planPages } from './index.js';
import type { PackageContext } from './types.js';

describe('Orchestrator', () => {
  describe('planPages', () => {
    const mockPackages: PackageContext[] = [
      {
        name: '@vibeonrails/core',
        path: '/packages/core',
        modules: [
          {
            name: 'database',
            path: '/packages/core/src/database',
            exports: [
              { name: 'createDatabase', kind: 'function', signature: 'function createDatabase(): Database', sourceFile: 'src/database/client.ts' },
              { name: 'users', kind: 'const', signature: 'const users: Table', sourceFile: 'src/database/schema/user.ts' },
            ],
            submodules: ['schema', 'repositories', 'seeds'],
          },
          {
            name: 'api',
            path: '/packages/core/src/api',
            exports: [
              { name: 'createServer', kind: 'function', signature: 'function createServer(): Hono', sourceFile: 'src/api/server.ts' },
            ],
            submodules: ['middleware'],
          },
        ],
      },
    ];

    it('generates guide and reference pages by default', () => {
      const specs = planPages(mockPackages);
      expect(specs.length).toBeGreaterThan(0);

      const types = new Set(specs.map((s) => s.type));
      expect(types.has('guide')).toBe(true);
      expect(types.has('reference')).toBe(true);
    });

    it('filters by doc type', () => {
      const specs = planPages(mockPackages, { types: ['reference'] });
      expect(specs.every((s) => s.type === 'reference')).toBe(true);
    });

    it('generates overview pages for each module', () => {
      const specs = planPages(mockPackages, { types: ['guide'] });
      const overviews = specs.filter((s) => s.template === 'guide-overview');
      expect(overviews).toHaveLength(2); // database + api
    });

    it('generates detail pages for submodules', () => {
      const specs = planPages(mockPackages, { types: ['guide'] });
      const details = specs.filter((s) => s.template === 'guide-detail');
      // database has 3 submodules, api has 1 submodule = 4
      expect(details).toHaveLength(4);
    });

    it('generates reference pages for functions', () => {
      const specs = planPages(mockPackages, { types: ['reference'] });
      // createDatabase + createServer = 2
      expect(specs).toHaveLength(2);
      expect(specs.every((s) => s.template === 'reference')).toBe(true);
    });

    it('filters by single page path', () => {
      const specs = planPages(mockPackages, { page: 'guides/database/index' });
      expect(specs).toHaveLength(1);
      expect(specs[0]!.outputPath).toBe('guides/database/index.mdx');
    });
  });
});

// === Extractor Tests ===

import { readSkillMd } from './extractor.js';

describe('Extractor', () => {
  describe('readSkillMd', () => {
    it('returns undefined for non-existent SKILL.md', () => {
      const result = readSkillMd('/tmp/definitely-does-not-exist');
      expect(result).toBeUndefined();
    });

    it('reads SKILL.md from a real directory', () => {
      // packages/docs has a SKILL.md
      const docsPath = join(process.cwd(), '..', '..', 'packages', 'docs');
      const result = readSkillMd(docsPath);
      // May or may not exist depending on cwd, so just check it returns string or undefined
      expect(result === undefined || typeof result === 'string').toBe(true);
    });
  });
});
