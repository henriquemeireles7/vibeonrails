/**
 * Generated Content Validator
 *
 * Validates generated MDX content for accuracy:
 * - Frontmatter has required fields
 * - Import paths reference real packages
 * - Function/type names match real exports
 */

import type { ExportInfo, ValidationResult } from './types.js';

/**
 * Validate a generated MDX page.
 *
 * @param content - Raw MDX content string
 * @param knownExports - All real exports from the module being documented
 * @param knownPackages - All real package names in the project
 * @returns ValidationResult with errors and warnings
 */
export function validateGeneratedPage(
  content: string,
  knownExports: ExportInfo[],
  knownPackages: string[],
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check frontmatter exists
  const frontmatterResult = validateFrontmatter(content);
  errors.push(...frontmatterResult.errors);
  warnings.push(...frontmatterResult.warnings);

  // Check import paths
  const importResult = validateImportPaths(content, knownPackages);
  warnings.push(...importResult.warnings);

  // Check export name references
  const exportResult = validateExportReferences(content, knownExports);
  warnings.push(...exportResult.warnings);

  // Check for common generation issues
  const qualityResult = validateQuality(content);
  warnings.push(...qualityResult.warnings);

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate frontmatter structure.
 */
export function validateFrontmatter(content: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check frontmatter delimiters exist
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) {
    errors.push('Missing frontmatter (--- delimiters not found)');
    return { valid: false, errors, warnings };
  }

  const fm = fmMatch[1]!;

  // Check required fields
  if (!fm.includes('title:')) {
    errors.push('Frontmatter missing "title" field');
  }

  if (!fm.includes('description:')) {
    warnings.push('Frontmatter missing "description" field');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Validate that import paths in code examples reference real packages.
 */
export function validateImportPaths(
  content: string,
  knownPackages: string[],
): ValidationResult {
  const warnings: string[] = [];

  // Find all import statements in code blocks
  const importRegex = /from\s+['"](@vibeonrails\/[^'"]+)['"]/g;
  let match;

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1]!;
    // Extract the package name (first two segments)
    const parts = importPath.split('/');
    const packageName = parts.length >= 2 ? `${parts[0]}/${parts[1]}` : importPath;

    if (!knownPackages.some((pkg) => packageName.startsWith(pkg) || pkg.startsWith(packageName))) {
      warnings.push(`Import path "${importPath}" references unknown package "${packageName}"`);
    }
  }

  return { valid: true, warnings, errors: [] };
}

/**
 * Validate that function/type names in code examples reference real exports.
 */
export function validateExportReferences(
  content: string,
  knownExports: ExportInfo[],
): ValidationResult {
  const warnings: string[] = [];
  const exportNames = new Set(knownExports.map((e) => e.name));

  // Find named imports: import { foo, bar } from '...'
  const namedImportRegex = /import\s*\{([^}]+)\}\s*from\s*['"]@vibeonrails\/[^'"]+['"]/g;
  let match;

  while ((match = namedImportRegex.exec(content)) !== null) {
    const imports = match[1]!.split(',').map((s) => s.trim().split(' as ')[0]!.replace('type ', '').trim());

    for (const imp of imports) {
      if (imp && !exportNames.has(imp)) {
        // Only warn, don't error — the import might be from a different module
        // that we don't have context for
        warnings.push(`Import "${imp}" not found in known exports for this module`);
      }
    }
  }

  return { valid: true, warnings, errors: [] };
}

/**
 * Check for common quality issues in generated content.
 */
export function validateQuality(content: string): ValidationResult {
  const warnings: string[] = [];

  // Check for emoji usage
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
  if (emojiRegex.test(content)) {
    warnings.push('Content contains emojis (VibeonRails convention: no emojis)');
  }

  // Check for very short content
  const lineCount = content.split('\n').length;
  if (lineCount < 20) {
    warnings.push(`Content is very short (${lineCount} lines) — may be incomplete`);
  }

  // Check for very long content
  if (lineCount > 400) {
    warnings.push(`Content is very long (${lineCount} lines) — consider splitting`);
  }

  // Check for placeholder text
  const placeholders = ['TODO', 'FIXME', 'PLACEHOLDER', 'lorem ipsum'];
  for (const placeholder of placeholders) {
    if (content.toLowerCase().includes(placeholder.toLowerCase())) {
      warnings.push(`Content contains placeholder text: "${placeholder}"`);
    }
  }

  // Check for markdown code fence wrapping (common LLM mistake)
  if (content.startsWith('```mdx') || content.startsWith('```markdown')) {
    warnings.push('Content is wrapped in markdown code fences — will be auto-stripped');
  }

  return { valid: true, warnings, errors: [] };
}

/**
 * Strip common LLM output artifacts from generated content.
 *
 * @param content - Raw LLM output
 * @returns Cleaned MDX content
 */
export function cleanGeneratedContent(content: string): string {
  let cleaned = content.trim();

  // Strip wrapping code fences (```mdx ... ``` or ```markdown ... ```)
  const fenceMatch = cleaned.match(/^```(?:mdx|markdown)?\n([\s\S]*)\n```$/);
  if (fenceMatch) {
    cleaned = fenceMatch[1]!.trim();
  }

  // Strip leading/trailing blank lines
  cleaned = cleaned.replace(/^\n+/, '').replace(/\n+$/, '');

  // Ensure single trailing newline
  cleaned += '\n';

  return cleaned;
}
