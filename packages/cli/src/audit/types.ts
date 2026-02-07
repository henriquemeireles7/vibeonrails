/**
 * Audit System Types
 *
 * Core type definitions for the vibe audit command.
 * All 172 checks from vibeaudit.md use these types.
 */

// ---------------------------------------------------------------------------
// Enums & Literals
// ---------------------------------------------------------------------------

export type Severity = "critical" | "high" | "medium" | "low";

export type CheckStatus = "pass" | "fail" | "warn" | "skip";

export type AuditCategory =
  | "top30"
  | "security"
  | "performance"
  | "testing"
  | "code-quality"
  | "error-handling"
  | "architecture"
  | "deployment"
  | "observability"
  | "business"
  | "data-integrity"
  | "ux"
  | "compliance"
  | "ai-patterns";

export const SEVERITY_WEIGHT: Record<Severity, number> = {
  critical: 10,
  high: 5,
  medium: 2,
  low: 1,
};

export const ALL_CATEGORIES: AuditCategory[] = [
  "top30",
  "security",
  "performance",
  "testing",
  "code-quality",
  "error-handling",
  "architecture",
  "deployment",
  "observability",
  "business",
  "data-integrity",
  "ux",
  "compliance",
  "ai-patterns",
];

// ---------------------------------------------------------------------------
// Core Interfaces
// ---------------------------------------------------------------------------

export interface Finding {
  file: string;
  line?: number;
  code?: string;
  message: string;
  suggestion?: string;
}

export interface CheckResult {
  status: CheckStatus;
  findings: Finding[];
}

export interface AuditCheck {
  id: string;
  name: string;
  category: AuditCategory;
  severity: Severity;
  description: string;
  automatable: boolean;
  autoFixable: boolean;
  check: (ctx: AuditContext) => Promise<CheckResult>;
}

export interface AuditContext {
  projectRoot: string;
  sourceFiles: string[];
  testFiles: string[];
  allFiles: string[];
  readFile: (relativePath: string) => string;
  fileExists: (relativePath: string) => boolean;
  fileLines: (relativePath: string) => string[];
  packageJson: Record<string, unknown> | null;
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface AuditCheckResult {
  id: string;
  name: string;
  category: AuditCategory;
  severity: Severity;
  description: string;
  automatable: boolean;
  autoFixable: boolean;
  status: CheckStatus;
  findings: Finding[];
}

export interface AuditReport {
  timestamp: string;
  projectRoot: string;
  totalChecks: number;
  passed: number;
  failed: number;
  warned: number;
  skipped: number;
  score: number;
  results: AuditCheckResult[];
}

// ---------------------------------------------------------------------------
// Filter Options
// ---------------------------------------------------------------------------

export interface AuditFilterOptions {
  categories?: AuditCategory[];
  severities?: Severity[];
  ids?: string[];
  excludeIds?: string[];
  automatableOnly?: boolean;
  top30Only?: boolean;
}
