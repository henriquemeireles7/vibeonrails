/**
 * Error Handling & Resilience (ERR-001 through ERR-010)
 *
 * From vibeaudit.md: How your app behaves when things go wrong.
 */

import type { AuditCheck } from "../types.js";
import { patternCheck, configCheck, manualCheck } from "../helpers.js";

export const errorHandlingChecks: AuditCheck[] = [
  // ERR-001: No Silent Error Swallowing
  patternCheck({
    id: "ERR-001",
    name: "No Silent Error Swallowing",
    category: "error-handling",
    severity: "critical",
    description: "No empty catch blocks. Every catch either handles, logs, or re-throws.",
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    message: "Empty catch block swallows errors silently",
    suggestion: "Log the error, handle it, or re-throw it",
    autoFixable: true,
  }),

  // ERR-002: User-Facing Errors Are Friendly
  patternCheck({
    id: "ERR-002",
    name: "User-Facing Errors Are Friendly",
    category: "error-handling",
    severity: "high",
    description: "Users see helpful messages, not JSON blobs or blank screens.",
    pattern: /res\.(?:status|json)\s*\(.*(?:e\.message|error\.message|err\.message|e\.stack)/,
    fileFilter: (f) => !f.includes(".test."),
    message: "Raw error message exposed in API response",
    suggestion: "Return user-friendly error messages in production",
  }),

  // ERR-003: Error Boundaries in UI
  configCheck({
    id: "ERR-003",
    name: "Error Boundaries in UI",
    category: "error-handling",
    severity: "high",
    description: "React error boundaries catch component crashes and show fallback UI.",
    validate: (ctx) => {
      const hasReact = ctx.sourceFiles.some((f) => f.endsWith(".tsx") || f.endsWith(".jsx"));
      if (!hasReact) return [];
      const hasErrorBoundary = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /ErrorBoundary|componentDidCatch|getDerivedStateFromError|error-boundary/i.test(content);
      });
      if (hasErrorBoundary) return [];
      return [{ file: "", message: "No React error boundaries detected", suggestion: "Add ErrorBoundary components to catch UI crashes" }];
    },
  }),

  // ERR-004: Network Failure Handling
  configCheck({
    id: "ERR-004",
    name: "Network Failure Handling",
    category: "error-handling",
    severity: "medium",
    description: "App handles offline/slow network gracefully. Loading states exist.",
    validate: (ctx) => {
      const hasLoading = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /isLoading|loading|pending|skeleton|spinner/i.test(content);
      });
      if (hasLoading) return [];
      return [{ file: "", message: "No loading state handling detected", suggestion: "Add loading states and network error handling" }];
    },
  }),

  // ERR-005: Form Submission Failure Recovery
  manualCheck({
    id: "ERR-005",
    name: "Form Submission Failure Recovery",
    category: "error-handling",
    severity: "medium",
    description: "If a form submission fails, user input is preserved.",
  }),

  // ERR-006: External Service Failure Isolation
  configCheck({
    id: "ERR-006",
    name: "External Service Failure Doesn't Break Core",
    category: "error-handling",
    severity: "high",
    description: "If analytics or email is down, the core app still works.",
    validate: (ctx) => {
      const findings: Array<{ file: string; message: string; suggestion?: string }> = [];
      const externalCalls = ctx.sourceFiles.filter((f) => {
        const content = ctx.readFile(f);
        return /analytics|sendEmail|tracking|telemetry/i.test(content);
      });
      for (const file of externalCalls) {
        const content = ctx.readFile(file);
        if (!/try\s*\{|catch|\.catch\(|Promise\.allSettled/i.test(content)) {
          findings.push({ file, message: "External service call without error isolation", suggestion: "Wrap non-critical services in try-catch" });
        }
      }
      return findings;
    },
  }),

  // ERR-007: Loading States on All Async Operations
  configCheck({
    id: "ERR-007",
    name: "Loading States on Async Operations",
    category: "error-handling",
    severity: "medium",
    description: "Every button/action with a network request shows loading and prevents double-submit.",
    validate: (ctx) => {
      const hasLoadingUI = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /disabled.*loading|isSubmitting|isPending|useMutation|useTransition/i.test(content);
      });
      if (hasLoadingUI) return [];
      const hasReact = ctx.sourceFiles.some((f) => f.endsWith(".tsx"));
      if (!hasReact) return [];
      return [{ file: "", message: "No double-submit prevention detected", suggestion: "Add loading states and disable buttons during submission" }];
    },
  }),

  // ERR-008: Empty States Designed
  configCheck({
    id: "ERR-008",
    name: "Empty States Designed",
    category: "error-handling",
    severity: "low",
    description: "Every list/collection view has an explicit empty state UI.",
    validate: (ctx) => {
      const hasEmptyState = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /empty.*state|no.*items|no.*results|\.length\s*===?\s*0/i.test(content);
      });
      if (hasEmptyState) return [];
      return [];
    },
  }),

  // ERR-009: 404 and Error Pages Exist
  configCheck({
    id: "ERR-009",
    name: "404 and Error Pages Exist",
    category: "error-handling",
    severity: "medium",
    description: "Custom 404 and 500 error pages exist with navigation.",
    validate: (ctx) => {
      const has404 = ctx.allFiles.some((f) => /404|not-found|notFound/i.test(f));
      if (has404) return [];
      return [{ file: "", message: "No custom 404/error page detected", suggestion: "Create custom 404 and 500 error pages" }];
    },
  }),

  // ERR-010: Structured Error Logging
  configCheck({
    id: "ERR-010",
    name: "Structured Error Logging",
    category: "error-handling",
    severity: "high",
    description: "Errors logged with context: user ID, request path, stack trace, timestamp.",
    validate: (ctx) => {
      const hasStructuredLogging = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /logger\.|winston|pino|bunyan|structuredLog|createLogger/i.test(content);
      });
      if (hasStructuredLogging) return [];
      return [{ file: "", message: "No structured logging detected", suggestion: "Use a structured logger (pino, winston) instead of console.log" }];
    },
  }),
];
