/**
 * Predictive Error Prevention
 *
 * Dev mode file watcher analyzes code on save. Detects:
 * - Missing Zod validation on user input
 * - Unhandled errors
 * - Missing auth on new routes
 * - SQL injection patterns
 *
 * Warns BEFORE code runs. Real-time security + correctness linter.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WarningCategory = "validation" | "auth" | "sql-injection" | "error-handling" | "security";
export type WarningSeverity = "error" | "warning" | "info";

export interface PreventionWarning {
  id: string;
  category: WarningCategory;
  severity: WarningSeverity;
  message: string;
  file: string;
  line: number;
  suggestion: string;
}

export interface AnalysisResult {
  file: string;
  warnings: PreventionWarning[];
  analyzedAt: string;
}

// ---------------------------------------------------------------------------
// Pattern Definitions
// ---------------------------------------------------------------------------

export interface DetectionPattern {
  id: string;
  category: WarningCategory;
  severity: WarningSeverity;
  /** Regex to detect the problematic pattern */
  pattern: RegExp;
  /** Regex that, if present on the same line or nearby, indicates the issue is handled */
  safePattern?: RegExp;
  message: string;
  suggestion: string;
}

export const DETECTION_PATTERNS: DetectionPattern[] = [
  // Missing Zod validation on request input
  {
    id: "missing-validation-req-body",
    category: "validation",
    severity: "warning",
    pattern: /req\.body(?!\s*\.\s*parse|\s*as\s+z\.)/,
    safePattern: /z\.(?:object|string|number|array|unknown)\(|\.parse\(|\.safeParse\(/,
    message: "User input accessed without Zod validation",
    suggestion: "Use schema.parse(req.body) or tRPC .input() to validate user input",
  },
  {
    id: "missing-validation-query-params",
    category: "validation",
    severity: "warning",
    pattern: /req\.query\b|req\.params\b|c\.req\.query|c\.req\.param/,
    safePattern: /z\.(?:object|string|number)\(|\.parse\(|\.safeParse\(/,
    message: "Query parameters or route params accessed without validation",
    suggestion: "Validate query/route params with Zod schema before use",
  },

  // SQL injection patterns
  {
    id: "sql-string-concat",
    category: "sql-injection",
    severity: "error",
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE|WHERE).*\$\{|`.*(?:SELECT|INSERT|UPDATE|DELETE|WHERE).*\$\{/i,
    message: "Potential SQL injection: string interpolation in SQL query",
    suggestion: "Use parameterized queries (Drizzle ORM) instead of string interpolation",
  },
  {
    id: "sql-plus-concat",
    category: "sql-injection",
    severity: "error",
    pattern: /(?:SELECT|INSERT|UPDATE|DELETE)\s.*\+\s*(?:req\.|input\.|params\.|query\.)/i,
    message: "Potential SQL injection: concatenating user input into SQL",
    suggestion: "Use parameterized queries or Drizzle ORM query builder",
  },

  // Missing auth on routes
  {
    id: "missing-auth-route",
    category: "auth",
    severity: "warning",
    pattern: /\.(?:post|put|patch|delete)\s*\(\s*["'`][^"'`]*["'`]\s*,/,
    safePattern: /protectedProcedure|requireAuth|isAuthenticated|authMiddleware|auth\(\)/,
    message: "Mutation route without visible authentication middleware",
    suggestion: "Use protectedProcedure or add auth middleware to mutation routes",
  },

  // Unhandled async errors
  {
    id: "unhandled-promise",
    category: "error-handling",
    severity: "warning",
    pattern: /(?:async\s+function|async\s*\()(?:(?!try\s*\{).)*\{[^}]*await\b/s,
    safePattern: /try\s*\{|\.catch\(|catchError/,
    message: "Async function with await but no error handling",
    suggestion: "Wrap await calls in try/catch or use .catch() for error handling",
  },

  // Hardcoded secrets
  {
    id: "hardcoded-secret",
    category: "security",
    severity: "error",
    pattern: /(?:password|secret|api_key|apiKey|token|private_key)\s*[:=]\s*["'`][A-Za-z0-9+/=]{8,}/i,
    safePattern: /process\.env|import\.meta\.env|getEnv\(|config\./,
    message: "Possible hardcoded secret detected",
    suggestion: "Move secrets to environment variables (process.env.SECRET_NAME)",
  },

  // Console.log in production code
  {
    id: "console-log-production",
    category: "security",
    severity: "info",
    pattern: /console\.log\(/,
    message: "console.log found — may leak data in production",
    suggestion: "Use the VoR logger (@vibeonrails/infra/logging) instead of console.log",
  },
];

// ---------------------------------------------------------------------------
// Analysis Engine
// ---------------------------------------------------------------------------

/** Analyze a single line of code against detection patterns. */
export function analyzeLine(
  line: string,
  lineNumber: number,
  file: string,
  contextLines: string[] = [],
): PreventionWarning[] {
  const warnings: PreventionWarning[] = [];

  for (const pattern of DETECTION_PATTERNS) {
    if (!pattern.pattern.test(line)) continue;

    // Check if the "safe" pattern exists nearby (same line or in context)
    if (pattern.safePattern) {
      const allContext = [line, ...contextLines].join("\n");
      if (pattern.safePattern.test(allContext)) continue;
    }

    warnings.push({
      id: pattern.id,
      category: pattern.category,
      severity: pattern.severity,
      message: pattern.message,
      file,
      line: lineNumber,
      suggestion: pattern.suggestion,
    });
  }

  return warnings;
}

/** Analyze an entire file's content for preventive warnings. */
export function analyzeFile(filePath: string, content: string): AnalysisResult {
  const lines = content.split("\n");
  const allWarnings: PreventionWarning[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Skip comment lines and empty lines
    if (line.trim().startsWith("//") || line.trim().startsWith("*") || line.trim() === "") {
      continue;
    }

    // Get surrounding context (5 lines before and after)
    const contextStart = Math.max(0, i - 5);
    const contextEnd = Math.min(lines.length, i + 6);
    const contextLines = lines.slice(contextStart, contextEnd);

    const warnings = analyzeLine(line, i + 1, filePath, contextLines);
    allWarnings.push(...warnings);
  }

  // Deduplicate warnings by id + line
  const seen = new Set<string>();
  const deduplicated = allWarnings.filter((w) => {
    const key = `${w.id}:${w.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    file: filePath,
    warnings: deduplicated,
    analyzedAt: new Date().toISOString(),
  };
}

/** Analyze multiple files and return combined results. */
export function analyzeFiles(
  files: Array<{ path: string; content: string }>,
): AnalysisResult[] {
  return files.map((f) => analyzeFile(f.path, f.content));
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Format a warning for terminal output. */
export function formatWarning(warning: PreventionWarning): string {
  const severityMap: Record<WarningSeverity, string> = {
    error: "ERROR",
    warning: "WARN",
    info: "INFO",
  };

  const lines: string[] = [];
  lines.push(
    `  ${severityMap[warning.severity]} [${warning.category}] ${warning.message}`,
  );
  lines.push(
    `    ${warning.file}:${warning.line}`,
  );
  lines.push(
    `    Fix: ${warning.suggestion}`,
  );
  return lines.join("\n");
}

/** Format a complete analysis result for terminal output. */
export function formatAnalysisResult(result: AnalysisResult): string {
  if (result.warnings.length === 0) return "";

  const lines: string[] = [];
  lines.push(`\n  ${result.file} (${result.warnings.length} warning(s)):`);
  for (const warning of result.warnings) {
    lines.push(formatWarning(warning));
  }
  return lines.join("\n");
}

/** Check if a file should be analyzed (TypeScript/JavaScript source files). */
export function shouldAnalyzeFile(filePath: string): boolean {
  const ext = filePath.split(".").pop()?.toLowerCase();
  if (!ext) return false;

  const analyzableExtensions = ["ts", "tsx", "js", "jsx"];
  if (!analyzableExtensions.includes(ext)) return false;

  // Skip test files, config files, and generated files
  if (filePath.includes(".test.") || filePath.includes(".spec.")) return false;
  if (filePath.includes("node_modules/")) return false;
  if (filePath.includes("/dist/")) return false;
  if (filePath.includes(".config.")) return false;

  return true;
}
