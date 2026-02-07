/**
 * Testing Checks (TEST-001 through TEST-012)
 *
 * From vibeaudit.md: Strategic testing for small teams.
 */

import type { AuditCheck } from "../types.js";
import { configCheck, manualCheck } from "../helpers.js";

export const testingChecks: AuditCheck[] = [
  // TEST-001: Payment Flow E2E Test
  configCheck({
    id: "TEST-001",
    name: "Payment Flow E2E Test",
    category: "testing",
    severity: "critical",
    description: "At least one test covers the full payment lifecycle.",
    validate: (ctx) => {
      const hasPaymentTest = ctx.testFiles.some((f) => {
        const content = ctx.readFile(f);
        return /payment|stripe|checkout|subscribe|billing/i.test(f) || /payment|stripe|checkout|subscribe/i.test(content);
      });
      if (hasPaymentTest) return [];
      const hasPaymentCode = ctx.sourceFiles.some((f) => /payment|stripe|checkout/i.test(f));
      if (!hasPaymentCode) return [];
      return [{ file: "", message: "Payment code exists but no payment tests found", suggestion: "Add E2E test for payment flow" }];
    },
  }),

  // TEST-002: Auth Flow E2E Test
  configCheck({
    id: "TEST-002",
    name: "Auth Flow E2E Test",
    category: "testing",
    severity: "high",
    description: "At least one test covers register, login, protected route, logout.",
    validate: (ctx) => {
      const hasAuthTest = ctx.testFiles.some((f) => {
        const content = ctx.readFile(f);
        return /auth|login|register|signup/i.test(f) || /login|register|signUp|authenticate/i.test(content);
      });
      if (hasAuthTest) return [];
      return [{ file: "", message: "No auth flow tests detected", suggestion: "Add E2E test for authentication flow" }];
    },
  }),

  // TEST-003: Smoke Test on Deploy
  configCheck({
    id: "TEST-003",
    name: "Smoke Test on Deploy",
    category: "testing",
    severity: "high",
    description: "A basic check runs after deploy verifying core functionality.",
    validate: (ctx) => {
      const hasCi = ctx.allFiles.some((f) => f.includes(".github/workflows") || f.includes("ci"));
      if (hasCi) return [];
      return [{ file: "", message: "No CI/CD pipeline with post-deploy smoke tests", suggestion: "Add deploy smoke test to CI pipeline" }];
    },
  }),

  // TEST-004: Business Logic Unit Tests
  configCheck({
    id: "TEST-004",
    name: "Business Logic Unit Tests",
    category: "testing",
    severity: "high",
    description: "Complex calculations have unit tests with edge cases.",
    validate: (ctx) => {
      if (ctx.testFiles.length > 0) return [];
      return [{ file: "", message: "No test files found", suggestion: "Add unit tests for business logic" }];
    },
  }),

  // TEST-005: Webhook Handler Tests
  configCheck({
    id: "TEST-005",
    name: "Webhook Handler Tests",
    category: "testing",
    severity: "high",
    description: "Payment webhook handlers are tested with real test events.",
    validate: (ctx) => {
      const hasWebhook = ctx.sourceFiles.some((f) => /webhook/i.test(f));
      if (!hasWebhook) return [];
      const hasWebhookTest = ctx.testFiles.some((f) => /webhook/i.test(f) || /webhook/i.test(ctx.readFile(f)));
      if (hasWebhookTest) return [];
      return [{ file: "", message: "Webhook handlers exist but no webhook tests found", suggestion: "Test webhook handlers with Stripe CLI test events" }];
    },
  }),

  // TEST-006: Database Migration Test
  configCheck({
    id: "TEST-006",
    name: "Database Migration Test",
    category: "testing",
    severity: "high",
    description: "Migrations can run from scratch without errors.",
    validate: (ctx) => {
      const hasMigrations = ctx.allFiles.some((f) => f.includes("migration") || f.includes("migrate"));
      if (!hasMigrations) return [];
      return [];
    },
  }),

  // TEST-007: Form Validation Tests
  configCheck({
    id: "TEST-007",
    name: "Form Validation Tests",
    category: "testing",
    severity: "medium",
    description: "Critical forms have tests with empty fields, invalid formats, malicious strings.",
    validate: (ctx) => {
      const hasValidationTests = ctx.testFiles.some((f) => {
        const content = ctx.readFile(f);
        return /valid|invalid|empty.*field|required|malicious|xss|script/i.test(content);
      });
      if (hasValidationTests) return [];
      if (ctx.testFiles.length === 0) return [{ file: "", message: "No validation tests found", suggestion: "Add form validation tests" }];
      return [];
    },
  }),

  // TEST-008: Authorization Tests
  configCheck({
    id: "TEST-008",
    name: "Authorization Tests",
    category: "testing",
    severity: "high",
    description: "Tests verify users CAN access what they should and CANNOT access what they shouldn't.",
    validate: (ctx) => {
      const hasAuthzTests = ctx.testFiles.some((f) => {
        const content = ctx.readFile(f);
        return /unauthorized|forbidden|403|401|access.*denied|permission/i.test(content);
      });
      if (hasAuthzTests) return [];
      return [{ file: "", message: "No authorization tests detected", suggestion: "Add tests verifying access control per role" }];
    },
  }),

  // TEST-009: No Flaky Tests
  manualCheck({
    id: "TEST-009",
    name: "No Flaky Tests",
    category: "testing",
    severity: "medium",
    description: "All tests in CI pass consistently. Flaky tests are fixed or removed.",
  }),

  // TEST-010: Tests Run in Under 5 Minutes
  manualCheck({
    id: "TEST-010",
    name: "Tests Run in Under 5 Minutes",
    category: "testing",
    severity: "medium",
    description: "Full test suite completes quickly enough that you run it before every deploy.",
  }),

  // TEST-011: Manual Testing Checklist
  configCheck({
    id: "TEST-011",
    name: "Manual Testing Checklist Exists",
    category: "testing",
    severity: "medium",
    description: "A written checklist exists for flows too complex to automate.",
    validate: (ctx) => {
      const hasChecklist = ctx.allFiles.some((f) => /checklist|test.*plan|qa|manual.*test/i.test(f));
      if (hasChecklist) return [];
      return [];
    },
  }),

  // TEST-012: Error Path Testing
  configCheck({
    id: "TEST-012",
    name: "Error Path Testing",
    category: "testing",
    severity: "medium",
    description: "Tests verify behavior when things go wrong, not just the happy path.",
    validate: (ctx) => {
      const hasErrorTests = ctx.testFiles.some((f) => {
        const content = ctx.readFile(f);
        return /throw|reject|error|fail|500|timeout|disconnect/i.test(content);
      });
      if (hasErrorTests) return [];
      return [{ file: "", message: "No error path tests detected", suggestion: "Add tests for error scenarios" }];
    },
  }),
];
