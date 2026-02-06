/**
 * Codebase Extractor
 *
 * Walks packages, parses TypeScript exports using ts-morph,
 * reads SKILL.md files, and produces structured PackageContext objects.
 */

import {
  Project,
  SyntaxKind,
  ModuleResolutionKind,
  ModuleKind,
  Node,
  type SourceFile,
  type ExportedDeclarations,
} from 'ts-morph';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { PackageContext, ModuleContext, ExportInfo, ParamInfo } from './types.js';

/**
 * Extract context from all packages in a monorepo.
 *
 * Uses a single shared ts-morph Project instance for performance.
 *
 * @param rootDir - Project root directory
 * @param packageFilter - Optional list of package names to include (e.g., ["core", "infra"])
 * @returns Array of PackageContext objects
 */
export function extractAllPackages(
  rootDir: string,
  packageFilter?: string[],
): PackageContext[] {
  const packagesDir = join(rootDir, 'packages');
  const featuresDir = join(rootDir, 'packages', 'features');
  const contexts: PackageContext[] = [];

  // Create a single shared Project for all parsing (avoids re-initializing
  // the TypeScript compiler for every module barrel)
  const project = createProject();

  // Scan packages/ directory for top-level packages
  if (existsSync(packagesDir)) {
    const entries = readdirSync(packagesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (entry.name === 'features') continue; // handled separately

      const pkgPath = join(packagesDir, entry.name);
      const pkgJsonPath = join(pkgPath, 'package.json');
      if (!existsSync(pkgJsonPath)) continue;

      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      const shortName = entry.name;

      if (packageFilter && !packageFilter.includes(shortName)) continue;

      const ctx = extractPackageContext(pkgPath, pkgJson.name as string, project);
      if (ctx.modules.length > 0) {
        contexts.push(ctx);
      }
    }
  }

  // Scan packages/features/ directory
  if (existsSync(featuresDir)) {
    const entries = readdirSync(featuresDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const pkgPath = join(featuresDir, entry.name);
      const pkgJsonPath = join(pkgPath, 'package.json');
      if (!existsSync(pkgJsonPath)) continue;

      const pkgJson = JSON.parse(readFileSync(pkgJsonPath, 'utf-8'));
      const shortName = `features/${entry.name}`;

      if (packageFilter && !packageFilter.includes(shortName) && !packageFilter.includes(entry.name)) continue;

      const ctx = extractPackageContext(pkgPath, pkgJson.name as string, project);
      if (ctx.modules.length > 0) {
        contexts.push(ctx);
      }
    }
  }

  return contexts;
}

/**
 * Create a shared ts-morph Project with the correct compiler options.
 */
function createProject(): Project {
  return new Project({
    compilerOptions: {
      declaration: false,
      noEmit: true,
      skipLibCheck: true,
      moduleResolution: ModuleResolutionKind.NodeNext,
      module: ModuleKind.NodeNext,
    },
    skipAddingFilesFromTsConfig: true,
  });
}

/**
 * Extract context from a single package.
 *
 * @param packagePath - Absolute path to the package directory
 * @param packageName - npm package name (e.g., "@vibeonrails/core")
 * @param project - Shared ts-morph Project instance (created if not provided)
 * @returns PackageContext
 */
export function extractPackageContext(
  packagePath: string,
  packageName: string,
  project?: Project,
): PackageContext {
  const skillContent = readSkillMd(packagePath);
  const srcDir = join(packagePath, 'src');

  if (!existsSync(srcDir)) {
    return { name: packageName, path: packagePath, skillContent, modules: [] };
  }

  const sharedProject = project ?? createProject();
  const modules = discoverModules(srcDir, packagePath, sharedProject);

  return {
    name: packageName,
    path: packagePath,
    skillContent,
    modules,
  };
}

/**
 * Discover modules within a package's src/ directory.
 * A module is a directory with an index.ts barrel export.
 */
function discoverModules(srcDir: string, packagePath: string, project: Project): ModuleContext[] {
  const modules: ModuleContext[] = [];
  const entries = readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const modulePath = join(srcDir, entry.name);
    const indexPath = join(modulePath, 'index.ts');

    if (!existsSync(indexPath)) continue;

    const skillContent = readSkillMd(modulePath);
    const submodules = discoverSubmodules(modulePath);
    const exports = extractExportsFromBarrel(indexPath, packagePath, project);

    modules.push({
      name: entry.name,
      path: modulePath,
      skillContent,
      exports,
      submodules,
    });
  }

  return modules;
}

/**
 * Discover submodule directory names within a module.
 */
function discoverSubmodules(modulePath: string): string[] {
  const submodules: string[] = [];
  const entries = readdirSync(modulePath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      submodules.push(entry.name);
    }
  }

  return submodules;
}

/**
 * Extract all public exports from a barrel index.ts file.
 * Uses a shared Project instance for performance.
 */
function extractExportsFromBarrel(
  indexPath: string,
  packagePath: string,
  project: Project,
): ExportInfo[] {
  // Add the barrel file and resolve its dependencies
  const sourceFile = project.addSourceFileAtPath(indexPath);
  const visited = new Set<string>();
  resolveExportSources(sourceFile, project, visited);

  const exports: ExportInfo[] = [];
  const exportedDeclarations = sourceFile.getExportedDeclarations();

  for (const [name, declarations] of exportedDeclarations) {
    if (declarations.length === 0) continue;
    const decl = declarations[0]!;

    const info = extractExportInfo(name, decl, packagePath);
    if (info) {
      exports.push(info);
    }
  }

  return exports;
}

/**
 * Resolve re-exported source files so ts-morph can analyze them.
 * Tracks visited file paths to prevent infinite recursion on circular re-exports.
 */
function resolveExportSources(
  sourceFile: SourceFile,
  project: Project,
  visited: Set<string>,
): void {
  const filePath = sourceFile.getFilePath();

  // Cycle detection: skip files we have already visited
  if (visited.has(filePath)) return;
  visited.add(filePath);

  const exportDecls = sourceFile.getExportDeclarations();

  for (const exportDecl of exportDecls) {
    const moduleSpecifier = exportDecl.getModuleSpecifierValue();
    if (!moduleSpecifier) continue;

    try {
      const resolved = exportDecl.getModuleSpecifierSourceFile();
      if (!resolved) {
        // Try to manually resolve the .ts file
        const dir = sourceFile.getDirectoryPath();
        const candidates = [
          join(dir, moduleSpecifier.replace(/\.js$/, '.ts')),
          join(dir, moduleSpecifier.replace(/\.js$/, ''), 'index.ts'),
          join(dir, moduleSpecifier + '.ts'),
          join(dir, moduleSpecifier, 'index.ts'),
        ];

        for (const candidate of candidates) {
          if (existsSync(candidate) && !visited.has(candidate)) {
            const added = project.addSourceFileAtPath(candidate);
            resolveExportSources(added, project, visited);
            break;
          }
        }
      } else {
        resolveExportSources(resolved, project, visited);
      }
    } catch {
      // Skip unresolvable modules (external deps, etc.)
    }
  }
}

/**
 * Extract ExportInfo from a single exported declaration.
 */
function extractExportInfo(
  name: string,
  decl: ExportedDeclarations,
  packagePath: string,
): ExportInfo | null {
  const sourceFile = decl.getSourceFile();
  const filePath = relative(packagePath, sourceFile.getFilePath());

  const jsdoc = extractJsDoc(decl);

  // Function declarations
  if (decl.isKind(SyntaxKind.FunctionDeclaration)) {
    const params = decl.getParameters().map(extractParam);
    const returnType = decl.getReturnType().getText(decl);

    return {
      name,
      kind: 'function',
      signature: getCleanSignature(decl.getText()),
      jsdoc,
      params,
      returnType: cleanType(returnType),
      sourceFile: filePath,
    };
  }

  // Type aliases
  if (decl.isKind(SyntaxKind.TypeAliasDeclaration)) {
    return {
      name,
      kind: 'type',
      signature: decl.getText(),
      jsdoc,
      sourceFile: filePath,
    };
  }

  // Interfaces
  if (decl.isKind(SyntaxKind.InterfaceDeclaration)) {
    return {
      name,
      kind: 'interface',
      signature: decl.getText(),
      jsdoc,
      sourceFile: filePath,
    };
  }

  // Variable declarations (const)
  if (decl.isKind(SyntaxKind.VariableDeclaration)) {
    return {
      name,
      kind: 'const',
      signature: `const ${name}: ${cleanType(decl.getType().getText(decl))}`,
      jsdoc,
      sourceFile: filePath,
    };
  }

  // Class declarations
  if (decl.isKind(SyntaxKind.ClassDeclaration)) {
    return {
      name,
      kind: 'class',
      signature: getClassSignature(decl),
      jsdoc,
      sourceFile: filePath,
    };
  }

  // Enum declarations
  if (decl.isKind(SyntaxKind.EnumDeclaration)) {
    return {
      name,
      kind: 'enum',
      signature: decl.getText(),
      jsdoc,
      sourceFile: filePath,
    };
  }

  return null;
}

/**
 * Extract a parameter's info.
 */
function extractParam(param: {
  getName(): string;
  getType(): { getText(node?: unknown): string };
  isOptional(): boolean;
  getInitializer(): { getText(): string } | undefined;
}): ParamInfo {
  return {
    name: param.getName(),
    type: cleanType(param.getType().getText()),
    required: !param.isOptional(),
    defaultValue: param.getInitializer()?.getText(),
  };
}

/**
 * Extract JSDoc comment text from a declaration.
 * Uses Node.isJSDocable() — the proper ts-morph type guard.
 */
function extractJsDoc(decl: ExportedDeclarations): string | undefined {
  if (!Node.isJSDocable(decl)) return undefined;

  const docs = decl.getJsDocs();
  if (docs.length === 0) return undefined;

  return docs.map((d: { getFullText(): string }) => d.getFullText()).join('\n').trim();
}

/**
 * Read SKILL.md from a directory, returning undefined if not found.
 */
export function readSkillMd(dirPath: string): string | undefined {
  const skillPath = join(dirPath, 'SKILL.md');

  // Also check case variations
  const variations = [skillPath, join(dirPath, 'SKILL.MD')];

  for (const p of variations) {
    if (existsSync(p)) {
      return readFileSync(p, 'utf-8');
    }
  }

  return undefined;
}

/**
 * Clean a type string by removing import() prefixes.
 * Handles nested import() patterns like: import("foo").Bar<import("baz").Qux>
 */
function cleanType(typeStr: string): string {
  // Iteratively strip import(...). and typeof import(...). patterns.
  // Using a loop handles nested cases that a single regex pass would miss.
  let result = typeStr;
  let prev = '';
  while (result !== prev) {
    prev = result;
    // Match import("..."). with a non-greedy quoted string inside
    result = result.replace(/(?:typeof\s+)?import\("[^"]*"\)\./g, '');
    result = result.replace(/(?:typeof\s+)?import\('[^']*'\)\./g, '');
  }
  return result;
}

/**
 * Get just the signature part of a function (first line + params).
 */
function getCleanSignature(text: string): string {
  // Take everything up to the first opening brace
  const braceIndex = text.indexOf('{');
  if (braceIndex === -1) return text.trim();
  return text.substring(0, braceIndex).trim();
}

/**
 * Get a class signature: declaration line, properties, and method signatures
 * without implementation bodies.
 */
function getClassSignature(decl: ExportedDeclarations): string {
  if (!decl.isKind(SyntaxKind.ClassDeclaration)) {
    return decl.getText().split('\n').slice(0, 5).join('\n');
  }

  const lines: string[] = [];

  // Class declaration line (e.g., "export class Foo extends Bar {")
  const name = decl.getName() ?? 'Anonymous';
  const heritage = decl.getHeritageClauses().map((h) => h.getText()).join(' ');
  lines.push(`class ${name}${heritage ? ' ' + heritage : ''} {`);

  // Constructor signature (if present)
  const ctors = decl.getConstructors();
  if (ctors.length > 0) {
    const ctor = ctors[0]!;
    const params = ctor.getParameters().map((p) => p.getText()).join(', ');
    lines.push(`  constructor(${params});`);
  }

  // Property signatures
  for (const prop of decl.getProperties()) {
    const modifiers = prop.getModifiers().map((m) => m.getText()).join(' ');
    const propName = prop.getName();
    const propType = cleanType(prop.getType().getText(prop));
    const prefix = modifiers ? modifiers + ' ' : '';
    lines.push(`  ${prefix}${propName}: ${propType};`);
  }

  // Method signatures (name + params + return, no body)
  for (const method of decl.getMethods()) {
    const modifiers = method.getModifiers().map((m) => m.getText()).join(' ');
    const methodName = method.getName();
    const params = method.getParameters().map((p) => p.getText()).join(', ');
    const returnType = cleanType(method.getReturnType().getText(method));
    const prefix = modifiers ? modifiers + ' ' : '';
    lines.push(`  ${prefix}${methodName}(${params}): ${returnType};`);
  }

  lines.push('}');
  return lines.join('\n');
}
