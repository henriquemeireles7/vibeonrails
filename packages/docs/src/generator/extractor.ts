/**
 * Codebase Extractor
 *
 * Walks packages, parses TypeScript exports using ts-morph,
 * reads SKILL.md files, and produces structured PackageContext objects.
 */

import { Project, SyntaxKind, type SourceFile, type ExportedDeclarations } from 'ts-morph';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { PackageContext, ModuleContext, ExportInfo, ParamInfo } from './types.js';

/**
 * Extract context from all packages in a monorepo.
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

      const ctx = extractPackageContext(pkgPath, pkgJson.name as string);
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

      const ctx = extractPackageContext(pkgPath, pkgJson.name as string);
      if (ctx.modules.length > 0) {
        contexts.push(ctx);
      }
    }
  }

  return contexts;
}

/**
 * Extract context from a single package.
 *
 * @param packagePath - Absolute path to the package directory
 * @param packageName - npm package name (e.g., "@vibeonrails/core")
 * @returns PackageContext
 */
export function extractPackageContext(
  packagePath: string,
  packageName: string,
): PackageContext {
  const skillContent = readSkillMd(packagePath);
  const srcDir = join(packagePath, 'src');

  if (!existsSync(srcDir)) {
    return { name: packageName, path: packagePath, skillContent, modules: [] };
  }

  const modules = discoverModules(srcDir, packagePath);

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
function discoverModules(srcDir: string, packagePath: string): ModuleContext[] {
  const modules: ModuleContext[] = [];
  const entries = readdirSync(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const modulePath = join(srcDir, entry.name);
    const indexPath = join(modulePath, 'index.ts');

    if (!existsSync(indexPath)) continue;

    const skillContent = readSkillMd(modulePath);
    const submodules = discoverSubmodules(modulePath);
    const exports = extractExportsFromBarrel(indexPath, packagePath);

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
 */
function extractExportsFromBarrel(
  indexPath: string,
  packagePath: string,
): ExportInfo[] {
  const project = new Project({
    compilerOptions: {
      declaration: false,
      noEmit: true,
      skipLibCheck: true,
      moduleResolution: 100, // NodeNext
      module: 199, // NodeNext
    },
    skipAddingFilesFromTsConfig: true,
  });

  // Add the barrel file and resolve its dependencies
  const sourceFile = project.addSourceFileAtPath(indexPath);
  resolveExportSources(sourceFile, project);

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
 */
function resolveExportSources(sourceFile: SourceFile, project: Project): void {
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
          if (existsSync(candidate)) {
            const added = project.addSourceFileAtPath(candidate);
            // Recursively resolve deeper re-exports
            resolveExportSources(added, project);
            break;
          }
        }
      } else {
        resolveExportSources(resolved, project);
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
      signature: getClassSignature(decl.getText()),
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
 */
function extractJsDoc(decl: ExportedDeclarations): string | undefined {
  if (!('getJsDocs' in decl)) return undefined;

  const docs = (decl as unknown as { getJsDocs(): Array<{ getFullText(): string }> }).getJsDocs();
  if (docs.length === 0) return undefined;

  return docs.map((d) => d.getFullText()).join('\n').trim();
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
 */
function cleanType(typeStr: string): string {
  return typeStr
    .replace(/import\([^)]+\)\./g, '')
    .replace(/typeof import\([^)]+\)\./g, '');
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
 * Get a class signature (declaration without method bodies).
 */
function getClassSignature(text: string): string {
  // Take just the first few lines (class declaration + constructor)
  const lines = text.split('\n');
  const signatureLines: string[] = [];

  for (const line of lines) {
    signatureLines.push(line);
    if (signatureLines.length > 20) {
      signatureLines.push('  // ...');
      break;
    }
  }

  return signatureLines.join('\n');
}
