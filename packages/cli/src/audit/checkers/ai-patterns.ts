/**
 * AI-Generated Code Specific Checks (AI-001 through AI-012)
 *
 * From vibeaudit.md: Patterns where AI-assisted development introduces problems.
 */

import type { AuditCheck } from "../types.js";
import { patternCheck, configCheck, manualCheck } from "../helpers.js";

export const aiPatternsChecks: AuditCheck[] = [
  // AI-001: No Placeholder Code in Production
  patternCheck({
    id: "AI-001",
    name: "No Placeholder Code in Production",
    category: "ai-patterns",
    severity: "high",
    description: "No TODO, FIXME, 'implement this', placeholder, mock, dummy, or lorem ipsum.",
    pattern: /(?:\/\/|\/\*|\*)\s*(?:TODO|FIXME|HACK|XXX|implement\s+this|placeholder|lorem\s+ipsum)/i,
    fileFilter: (f) => !f.includes(".test.") && !f.includes("__tests__"),
    message: "Placeholder or TODO marker in production code",
    suggestion: "Implement or remove placeholder code before production",
    autoFixable: false,
  }),

  // AI-002: No Hallucinated Imports
  configCheck({
    id: "AI-002",
    name: "No Hallucinated Imports",
    category: "ai-patterns",
    severity: "high",
    description: "All imported packages exist in package.json.",
    validate: (ctx) => {
      if (!ctx.packageJson) return [];
      const deps = {
        ...(ctx.packageJson.dependencies as Record<string, string> | undefined),
        ...(ctx.packageJson.devDependencies as Record<string, string> | undefined),
      };
      const findings: Array<{ file: string; line?: number; message: string; suggestion?: string }> = [];

      for (const file of ctx.sourceFiles) {
        const lines = ctx.fileLines(file);
        for (let i = 0; i < lines.length; i++) {
          const match = lines[i]!.match(/(?:import|require)\s*\(?['"]([^./'"@][^'"]*)['"]/);
          if (match) {
            const pkg = match[1]!.startsWith("@")
              ? match[1]!.split("/").slice(0, 2).join("/")
              : match[1]!.split("/")[0]!;
            const isBuiltin = ["node:", "fs", "path", "os", "url", "http", "https", "crypto", "stream", "util", "child_process", "events", "buffer", "querystring", "string_decoder", "timers", "assert", "net", "tls", "dns", "readline", "zlib", "worker_threads"].some(
              (b) => pkg === b || pkg.startsWith("node:"),
            );
            if (!isBuiltin && !(pkg in deps)) {
              findings.push({
                file,
                line: i + 1,
                message: `Package '${pkg}' imported but not in package.json`,
                suggestion: "Install the package or remove the import",
              });
            }
          }
        }
      }
      return findings;
    },
  }),

  // AI-003: No Deprecated API Usage
  manualCheck({
    id: "AI-003",
    name: "No Deprecated API Usage",
    category: "ai-patterns",
    severity: "medium",
    description: "No deprecated framework methods or removed APIs in production code.",
  }),

  // AI-004: No Inconsistent Patterns
  configCheck({
    id: "AI-004",
    name: "No Inconsistent Patterns",
    category: "ai-patterns",
    severity: "medium",
    description: "Same approach used for similar tasks (fetch vs axios, callbacks vs promises).",
    validate: (ctx) => {
      const hasFetch = ctx.sourceFiles.some((f) => /\bfetch\s*\(/i.test(ctx.readFile(f)));
      const hasAxios = ctx.sourceFiles.some((f) => /\baxios\b/i.test(ctx.readFile(f)));
      if (hasFetch && hasAxios) {
        return [{ file: "", message: "Mixed HTTP clients: both fetch() and axios detected", suggestion: "Standardize on one HTTP client" }];
      }
      return [];
    },
  }),

  // AI-005: No Overly Complex Solutions
  manualCheck({
    id: "AI-005",
    name: "No Overly Complex Solutions",
    category: "ai-patterns",
    severity: "medium",
    description: "No enterprise-grade abstractions for simple problems.",
  }),

  // AI-006: No Fake Error Handling
  patternCheck({
    id: "AI-006",
    name: "No Fake Error Handling",
    category: "ai-patterns",
    severity: "high",
    description: "Catch blocks that look like handling but actually swallow errors.",
    pattern: /catch\s*\([^)]*\)\s*\{\s*(?:console\.log\s*\(\s*['"]error['"]\s*\)|\/\/ ?handle|\/\/ ?ignore)\s*\}/i,
    message: "Catch block with fake error handling (just logging 'error')",
    suggestion: "Properly handle errors: log context, re-throw, or recover",
    autoFixable: false,
  }),

  // AI-007: No Generated Comments Explaining Obvious Code
  patternCheck({
    id: "AI-007",
    name: "No Obvious Code Comments",
    category: "ai-patterns",
    severity: "low",
    description: "Comments explain WHY, not WHAT. No '// increment counter' above counter++.",
    pattern: /\/\/\s*(?:increment|decrement|set|assign|return|initialize|declare|define|create|get|fetch)\s+(?:the\s+)?(?:\w+\s*$)/i,
    message: "Comment explains obvious code (WHAT instead of WHY)",
    suggestion: "Remove obvious comments or explain the WHY instead",
    autoFixable: true,
  }),

  // AI-008: No Orphaned Functions/Components
  manualCheck({
    id: "AI-008",
    name: "No Orphaned Functions/Components",
    category: "ai-patterns",
    severity: "medium",
    description: "No exported functions that are never imported anywhere.",
  }),

  // AI-009: No Mixed Async Patterns
  configCheck({
    id: "AI-009",
    name: "No Mixed Async Patterns",
    category: "ai-patterns",
    severity: "medium",
    description: "No mixing of .then() chains and async/await in the same flow.",
    validate: (ctx) => {
      const findings: Array<{ file: string; message: string; suggestion?: string }> = [];
      for (const file of ctx.sourceFiles) {
        const content = ctx.readFile(file);
        const hasAwait = /\bawait\b/.test(content);
        const hasThen = /\.then\s*\(/.test(content);
        if (hasAwait && hasThen) {
          findings.push({ file, message: "Mixed async patterns: both await and .then() in same file", suggestion: "Standardize on async/await" });
        }
      }
      return findings;
    },
  }),

  // AI-010: All Regex Has Been Tested
  manualCheck({
    id: "AI-010",
    name: "All AI-Generated Regex Tested",
    category: "ai-patterns",
    severity: "medium",
    description: "Every regex has been tested with valid, invalid, and edge case inputs.",
  }),

  // AI-011: No Unnecessary Dependencies
  configCheck({
    id: "AI-011",
    name: "No Unnecessary Dependencies",
    category: "ai-patterns",
    severity: "medium",
    description: "No large libraries imported for tasks solvable in 5 lines of code.",
    validate: (ctx) => {
      if (!ctx.packageJson) return [];
      const deps = ctx.packageJson.dependencies as Record<string, string> | undefined;
      if (!deps) return [];
      const heavyLibs = ["moment", "lodash", "underscore", "jquery", "rxjs"];
      const found = heavyLibs.filter((l) => l in deps);
      if (found.length === 0) return [];
      return found.map((lib) => ({
        file: "package.json",
        message: `Heavy dependency '${lib}' may be unnecessary`,
        suggestion: `Consider lighter alternatives (date-fns for moment, native methods for lodash)`,
      }));
    },
  }),

  // AI-012: Environment-Specific Code is Correct
  patternCheck({
    id: "AI-012",
    name: "No Dev URLs in Production Code",
    category: "ai-patterns",
    severity: "high",
    description: "No localhost references or test credentials in production code paths.",
    pattern: /['"]https?:\/\/localhost[:'"/]|['"]127\.0\.0\.1[:'"/]/,
    fileFilter: (f) => !f.includes(".test.") && !f.includes("__tests__") && !f.includes(".env") && !f.includes("config"),
    message: "Localhost/development URL in production code",
    suggestion: "Use environment variables for URLs",
  }),
];
