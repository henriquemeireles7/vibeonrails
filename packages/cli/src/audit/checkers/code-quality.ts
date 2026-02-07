/**
 * Code Quality & Maintainability (CODE-001 through CODE-015)
 *
 * From vibeaudit.md: Checks that keep your codebase workable as it grows.
 */

import type { AuditCheck } from "../types.js";
import { patternCheck, fileSizeCheck, configCheck, fileExistsCheck } from "../helpers.js";

export const codeQualityChecks: AuditCheck[] = [
  // CODE-001: No Files Over 400 Lines
  fileSizeCheck({
    id: "CODE-001",
    name: "No Files Over 400 Lines",
    category: "code-quality",
    severity: "high",
    description: "Any file exceeding 400 lines is split into logical modules.",
    maxLines: 400,
    message: "File exceeds 400 lines",
  }),

  // CODE-002: No Functions Over 40 Lines
  {
    id: "CODE-002",
    name: "No Functions Over 40 Lines",
    category: "code-quality" as const,
    severity: "high" as const,
    description: "Functions do one thing. Nested if-else deeper than 3 levels is refactored.",
    automatable: true,
    autoFixable: false,
    check: async (ctx) => {
      const findings: Array<{ file: string; line?: number; message: string; suggestion?: string }> = [];
      for (const file of ctx.sourceFiles) {
        const lines = ctx.fileLines(file);
        let funcStart = -1;
        let braceDepth = 0;
        let funcName = "";
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i]!;
          const funcMatch = line.match(/(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(|(\w+)\s*(?:=\s*)?(?:async\s*)?\([^)]*\)\s*(?:=>|{))/);
          if (funcMatch && funcStart === -1) {
            funcName = funcMatch[1] ?? funcMatch[2] ?? funcMatch[3] ?? "anonymous";
            funcStart = i;
            braceDepth = 0;
          }
          for (const ch of line) {
            if (ch === "{") braceDepth++;
            if (ch === "}") braceDepth--;
          }
          if (funcStart !== -1 && braceDepth <= 0 && i > funcStart) {
            const length = i - funcStart + 1;
            if (length > 40) {
              findings.push({
                file,
                line: funcStart + 1,
                message: `Function '${funcName}' is ${length} lines (max 40)`,
                suggestion: "Split into smaller functions",
              });
            }
            funcStart = -1;
          }
        }
      }
      return { status: findings.length === 0 ? "pass" : "fail", findings };
    },
  },

  // CODE-003: Consistent Naming Conventions
  patternCheck({
    id: "CODE-003",
    name: "Consistent Naming Conventions",
    category: "code-quality",
    severity: "medium",
    description: "Variables, functions, files follow a single convention consistently.",
    pattern: /(?:const|let|var)\s+[a-z]+_[a-z]+\s*=.*(?:const|let|var)\s+[a-z]+[A-Z][a-z]+\s*=/,
    message: "Mixed naming conventions (snake_case and camelCase) in same file",
    suggestion: "Pick one convention and standardize",
  }),

  // CODE-004: No Dead Code
  patternCheck({
    id: "CODE-004",
    name: "No Dead Code",
    category: "code-quality",
    severity: "medium",
    description: "No commented-out code blocks. Git preserves history.",
    pattern: /^\s*\/\/\s*(?:const|let|var|function|class|import|export|if|for|while|return)\s/,
    message: "Commented-out code detected",
    suggestion: "Remove dead code; git preserves history",
    autoFixable: true,
  }),

  // CODE-005: No Duplicate Code Blocks
  manualCheckInline("CODE-005", "No Duplicate Code Blocks", "code-quality", "high",
    "Same logic does not appear copy-pasted in 3+ places."),

  // CODE-006: Linter and Formatter Configured
  configCheck({
    id: "CODE-006",
    name: "Linter and Formatter Configured",
    category: "code-quality",
    severity: "medium",
    description: "ESLint/Prettier runs on save or pre-commit.",
    validate: (ctx) => {
      const lintConfigs = [".eslintrc", ".eslintrc.js", ".eslintrc.json", "eslint.config.js", "eslint.config.mjs", "eslint.config.ts", "biome.json"];
      const hasLinter = lintConfigs.some((f) => ctx.fileExists(f));
      if (hasLinter) return [];
      const pkg = ctx.packageJson;
      if (pkg && (pkg as Record<string, unknown>).eslintConfig) return [];
      return [{ file: "", message: "No linter configuration found", suggestion: "Add ESLint or Biome configuration" }];
    },
  }),

  // CODE-007: Clear Project Structure
  configCheck({
    id: "CODE-007",
    name: "Clear Project Structure",
    category: "code-quality",
    severity: "medium",
    description: "Files organized by feature or domain, findable within 60 seconds.",
    validate: (ctx) => {
      const hasSrc = ctx.allFiles.some((f) => f.startsWith("src/") || f.startsWith("packages/"));
      if (hasSrc) return [];
      return [{ file: "", message: "No clear project structure (src/ or packages/ directory)", suggestion: "Organize files by feature in src/ directory" }];
    },
  }),

  // CODE-008: No Magic Numbers or Strings
  patternCheck({
    id: "CODE-008",
    name: "No Magic Numbers or Strings",
    category: "code-quality",
    severity: "medium",
    description: "Important constants are defined as named constants, not scattered raw numbers.",
    pattern: /(?:timeout|delay|retries|maxAge|limit|size)\s*[:=]\s*\d{4,}/,
    message: "Possible magic number in configuration",
    suggestion: "Extract to a named constant or config file",
  }),

  // CODE-009: Error Messages Are Helpful
  patternCheck({
    id: "CODE-009",
    name: "Error Messages Are Helpful",
    category: "code-quality",
    severity: "medium",
    description: "Error messages tell users what went wrong and what to do about it.",
    pattern: /throw\s+new\s+Error\(\s*["'](?:Error|Something went wrong|Unknown error|Failed)["']\s*\)/i,
    message: "Generic/unhelpful error message",
    suggestion: "Provide specific error message with context and resolution steps",
  }),

  // CODE-010: TODO/FIXME/HACK Comments Tracked
  patternCheck({
    id: "CODE-010",
    name: "TODO/FIXME/HACK Comments Tracked",
    category: "code-quality",
    severity: "medium",
    description: "Technical debt markers in code are inventoried. FIXME in payment/auth is resolved.",
    pattern: /\/\/\s*(?:FIXME|HACK|XXX)(?:\s|:)/,
    fileFilter: (f) => f.includes("auth") || f.includes("payment") || f.includes("billing") || f.includes("stripe"),
    message: "FIXME/HACK in critical path code",
    suggestion: "Resolve technical debt markers in revenue-critical code",
  }),

  // CODE-011: Types/Schemas for Core Data
  configCheck({
    id: "CODE-011",
    name: "Types/Schemas for Core Data",
    category: "code-quality",
    severity: "high",
    description: "Core domain objects have explicit type definitions, not loose any types.",
    validate: (ctx) => {
      const hasTypes = ctx.sourceFiles.some((f) =>
        f.includes("type") || f.includes("schema") || f.includes("interface"),
      );
      if (hasTypes) return [];
      const hasTypeDefinitions = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /(?:interface|type)\s+(?:User|Payment|Subscription|Order|Product)/i.test(content);
      });
      if (hasTypeDefinitions) return [];
      return [{ file: "", message: "No core data type definitions detected", suggestion: "Define TypeScript interfaces or Zod schemas for core domain objects" }];
    },
  }),

  // CODE-012: No `any` Types in Critical Paths
  patternCheck({
    id: "CODE-012",
    name: "No `any` Types in Critical Paths",
    category: "code-quality",
    severity: "medium",
    description: "TypeScript any is not used in auth, payment, or data access code.",
    pattern: /:\s*any\b/,
    fileFilter: (f) => f.includes("auth") || f.includes("payment") || f.includes("database") || f.includes("security"),
    message: "`any` type in critical path code",
    suggestion: "Replace with proper TypeScript types",
    autoFixable: false,
  }),

  // CODE-013: Git Hygiene
  configCheck({
    id: "CODE-013",
    name: "Git Hygiene",
    category: "code-quality",
    severity: "medium",
    description: "Commits are descriptive, branches used for features, main is protected.",
    validate: (ctx) => {
      const hasGitignore = ctx.fileExists(".gitignore");
      if (hasGitignore) return [];
      return [{ file: "", message: "No .gitignore file found", suggestion: "Add .gitignore to exclude node_modules, dist, .env, etc." }];
    },
  }),

  // CODE-014: Environment Variables Documented
  configCheck({
    id: "CODE-014",
    name: "Environment Variables Documented",
    category: "code-quality",
    severity: "medium",
    description: "Every required env var is listed in .env.example with descriptions.",
    validate: (ctx) => {
      if (ctx.fileExists(".env.example")) return [];
      if (ctx.fileExists(".env.template")) return [];
      const hasEnvUsage = ctx.sourceFiles.some((f) => /process\.env\./i.test(ctx.readFile(f)));
      if (!hasEnvUsage) return [];
      return [{ file: "", message: "Environment variables used but no .env.example", suggestion: "Create .env.example documenting all required env vars" }];
    },
  }),

  // CODE-015: No Hardcoded URLs
  patternCheck({
    id: "CODE-015",
    name: "No Hardcoded URLs",
    category: "code-quality",
    severity: "medium",
    description: "API base URLs and service endpoints are configurable per environment.",
    pattern: /(?:fetch|axios|got|ky)\s*\(\s*['"]https?:\/\/(?!localhost|127\.0\.0\.1)[^'"]+['"]/,
    fileFilter: (f) => !f.includes(".test.") && !f.includes("__tests__"),
    message: "Hardcoded URL in production code",
    suggestion: "Use environment variables for API base URLs",
  }),
];

// Inline helper to avoid circular import
function manualCheckInline(
  id: string, name: string, category: "code-quality", severity: "high" | "medium",
  description: string,
): AuditCheck {
  return {
    id, name, category, severity, description,
    automatable: false, autoFixable: false,
    check: async () => ({
      status: "skip" as const,
      findings: [{ file: "", message: "Manual verification required", suggestion: description }],
    }),
  };
}
