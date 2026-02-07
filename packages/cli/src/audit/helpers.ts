/**
 * Audit Check Helpers
 *
 * Factory functions to create AuditCheck objects with common patterns.
 * Keeps checker files concise by abstracting repeated logic.
 */

import type {
  AuditCheck,
  AuditCategory,
  AuditContext,
  CheckResult,
  Finding,
  Severity,
} from "./types.js";

// ---------------------------------------------------------------------------
// patternCheck — Fails when a regex pattern IS found (bad pattern)
// ---------------------------------------------------------------------------

export function patternCheck(opts: {
  id: string;
  name: string;
  category: AuditCategory;
  severity: Severity;
  description: string;
  pattern: RegExp;
  fileFilter?: (file: string) => boolean;
  message: string;
  suggestion?: string;
  autoFixable?: boolean;
}): AuditCheck {
  return {
    id: opts.id,
    name: opts.name,
    category: opts.category,
    severity: opts.severity,
    description: opts.description,
    automatable: true,
    autoFixable: opts.autoFixable ?? false,
    check: async (ctx: AuditContext): Promise<CheckResult> => {
      const findings: Finding[] = [];
      const files = opts.fileFilter
        ? ctx.sourceFiles.filter(opts.fileFilter)
        : ctx.sourceFiles;

      for (const file of files) {
        const lines = ctx.fileLines(file);
        for (let i = 0; i < lines.length; i++) {
          if (opts.pattern.test(lines[i]!)) {
            findings.push({
              file,
              line: i + 1,
              code: lines[i]!.trim(),
              message: opts.message,
              suggestion: opts.suggestion,
            });
          }
        }
      }

      return {
        status: findings.length === 0 ? "pass" : "fail",
        findings,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// missingPatternCheck — Fails when a regex pattern is NOT found (required)
// ---------------------------------------------------------------------------

export function missingPatternCheck(opts: {
  id: string;
  name: string;
  category: AuditCategory;
  severity: Severity;
  description: string;
  pattern: RegExp;
  fileFilter?: (file: string) => boolean;
  message: string;
  suggestion?: string;
}): AuditCheck {
  return {
    id: opts.id,
    name: opts.name,
    category: opts.category,
    severity: opts.severity,
    description: opts.description,
    automatable: true,
    autoFixable: false,
    check: async (ctx: AuditContext): Promise<CheckResult> => {
      const findings: Finding[] = [];
      const files = opts.fileFilter
        ? ctx.sourceFiles.filter(opts.fileFilter)
        : ctx.sourceFiles;

      if (files.length === 0) {
        return { status: "pass", findings: [] };
      }

      for (const file of files) {
        const content = ctx.readFile(file);
        if (!opts.pattern.test(content)) {
          findings.push({
            file,
            message: opts.message,
            suggestion: opts.suggestion,
          });
        }
      }

      return {
        status: findings.length === 0 ? "pass" : "fail",
        findings,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// fileExistsCheck — Fails when required files are missing
// ---------------------------------------------------------------------------

export function fileExistsCheck(opts: {
  id: string;
  name: string;
  category: AuditCategory;
  severity: Severity;
  description: string;
  files: string[];
  contentPatterns?: RegExp[];
  message: string;
  suggestion?: string;
}): AuditCheck {
  return {
    id: opts.id,
    name: opts.name,
    category: opts.category,
    severity: opts.severity,
    description: opts.description,
    automatable: true,
    autoFixable: false,
    check: async (ctx: AuditContext): Promise<CheckResult> => {
      const findings: Finding[] = [];

      for (const file of opts.files) {
        if (!ctx.fileExists(file)) {
          findings.push({
            file,
            message: `${opts.message}: ${file} not found`,
            suggestion: opts.suggestion,
          });
        }
      }

      if (opts.contentPatterns && findings.length === 0) {
        for (const file of opts.files) {
          const content = ctx.readFile(file);
          for (const pattern of opts.contentPatterns) {
            if (!pattern.test(content)) {
              findings.push({
                file,
                message: `${opts.message}: missing pattern ${pattern.source}`,
                suggestion: opts.suggestion,
              });
            }
          }
        }
      }

      return {
        status: findings.length === 0 ? "pass" : "fail",
        findings,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// configCheck — Custom validation logic via callback
// ---------------------------------------------------------------------------

export function configCheck(opts: {
  id: string;
  name: string;
  category: AuditCategory;
  severity: Severity;
  description: string;
  validate: (ctx: AuditContext) => Finding[];
  autoFixable?: boolean;
}): AuditCheck {
  return {
    id: opts.id,
    name: opts.name,
    category: opts.category,
    severity: opts.severity,
    description: opts.description,
    automatable: true,
    autoFixable: opts.autoFixable ?? false,
    check: async (ctx: AuditContext): Promise<CheckResult> => {
      const findings = opts.validate(ctx);
      return {
        status: findings.length === 0 ? "pass" : "fail",
        findings,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// fileSizeCheck — Fails when files exceed line count threshold
// ---------------------------------------------------------------------------

export function fileSizeCheck(opts: {
  id: string;
  name: string;
  category: AuditCategory;
  severity: Severity;
  description: string;
  maxLines: number;
  fileFilter?: (file: string) => boolean;
  message: string;
}): AuditCheck {
  return {
    id: opts.id,
    name: opts.name,
    category: opts.category,
    severity: opts.severity,
    description: opts.description,
    automatable: true,
    autoFixable: false,
    check: async (ctx: AuditContext): Promise<CheckResult> => {
      const findings: Finding[] = [];
      const files = opts.fileFilter
        ? ctx.sourceFiles.filter(opts.fileFilter)
        : ctx.sourceFiles;

      for (const file of files) {
        const lines = ctx.fileLines(file);
        if (lines.length > opts.maxLines) {
          findings.push({
            file,
            message: `${opts.message}: ${lines.length} lines (max ${opts.maxLines})`,
            suggestion: `Split into smaller modules`,
          });
        }
      }

      return {
        status: findings.length === 0 ? "pass" : "fail",
        findings,
      };
    },
  };
}

// ---------------------------------------------------------------------------
// manualCheck — Always skips, requires human verification
// ---------------------------------------------------------------------------

export function manualCheck(opts: {
  id: string;
  name: string;
  category: AuditCategory;
  severity: Severity;
  description: string;
}): AuditCheck {
  return {
    id: opts.id,
    name: opts.name,
    category: opts.category,
    severity: opts.severity,
    description: opts.description,
    automatable: false,
    autoFixable: false,
    check: async (): Promise<CheckResult> => ({
      status: "skip",
      findings: [
        {
          file: "",
          message: "Manual verification required",
          suggestion: opts.description,
        },
      ],
    }),
  };
}
