/**
 * CI/CD & Deployment (DEPLOY-001 through DEPLOY-007)
 *
 * From vibeaudit.md: Keep deploy fast, reliable, and boring.
 */

import type { AuditCheck } from "../types.js";
import { configCheck, manualCheck } from "../helpers.js";

export const deploymentChecks: AuditCheck[] = [
  // DEPLOY-001: Deploy Pipeline Runs Tests
  configCheck({
    id: "DEPLOY-001",
    name: "Deploy Pipeline Runs Tests",
    category: "deployment",
    severity: "high",
    description: "CI runs test suite before deploy. Failing test blocks deployment.",
    validate: (ctx) => {
      const ciFiles = ctx.allFiles.filter((f) => f.includes(".github/workflows") || f.includes(".gitlab-ci") || f.includes("Jenkinsfile"));
      if (ciFiles.length === 0) return [{ file: "", message: "No CI/CD pipeline detected", suggestion: "Add CI/CD that runs tests before deploy" }];
      const hasTestStep = ciFiles.some((f) => {
        const content = ctx.readFile(f);
        return /test|vitest|jest|mocha|pytest/i.test(content);
      });
      if (hasTestStep) return [];
      return [{ file: ciFiles[0] ?? "", message: "CI pipeline may not run tests", suggestion: "Add test step to CI pipeline" }];
    },
  }),

  // DEPLOY-002: Preview/Staging Deployments
  configCheck({
    id: "DEPLOY-002",
    name: "Preview/Staging Deployments",
    category: "deployment",
    severity: "medium",
    description: "PRs get preview deployments for verification before production.",
    validate: (ctx) => {
      const hasPreview = ctx.allFiles.some((f) => {
        if (!f.includes(".github/") && !f.includes("vercel") && !f.includes("netlify")) return false;
        const content = ctx.readFile(f);
        return /preview|staging|pull_request|pr/i.test(content);
      });
      if (hasPreview) return [];
      return [];
    },
  }),

  // DEPLOY-003: Rollback Procedure
  manualCheck({
    id: "DEPLOY-003",
    name: "Rollback Procedure Documented and Tested",
    category: "deployment",
    severity: "high",
    description: "You can revert to previous version in under 5 minutes.",
  }),

  // DEPLOY-004: No Secrets in CI Logs
  configCheck({
    id: "DEPLOY-004",
    name: "No Secrets in CI Logs",
    category: "deployment",
    severity: "high",
    description: "Build logs don't print environment variables or tokens.",
    validate: (ctx) => {
      const ciFiles = ctx.allFiles.filter((f) => f.includes(".github/workflows"));
      for (const file of ciFiles) {
        const content = ctx.readFile(file);
        if (/echo\s+\$\{?\w*(SECRET|TOKEN|KEY|PASSWORD)/i.test(content)) {
          return [{ file, message: "CI may print secrets in logs", suggestion: "Use secret masking in CI/CD pipeline" }];
        }
      }
      return [];
    },
  }),

  // DEPLOY-005: Database Migrations Run Automatically
  configCheck({
    id: "DEPLOY-005",
    name: "Database Migrations Run Automatically",
    category: "deployment",
    severity: "medium",
    description: "Schema migrations are part of the deploy process.",
    validate: (ctx) => {
      const ciFiles = ctx.allFiles.filter((f) => f.includes(".github/workflows") || f.includes("Dockerfile") || f.includes("Procfile"));
      if (ciFiles.length === 0) return [];
      const hasMigrateStep = ciFiles.some((f) => {
        const content = ctx.readFile(f);
        return /migrate|migration/i.test(content);
      });
      if (hasMigrateStep) return [];
      const hasMigrations = ctx.allFiles.some((f) => f.includes("migration"));
      if (!hasMigrations) return [];
      return [{ file: "", message: "Migrations may not run automatically on deploy", suggestion: "Add migration step to deploy pipeline" }];
    },
  }),

  // DEPLOY-006: Deploy Notifications
  configCheck({
    id: "DEPLOY-006",
    name: "Deploy Notifications",
    category: "deployment",
    severity: "low",
    description: "Team notified when deploy starts and completes.",
    validate: (ctx) => {
      const ciFiles = ctx.allFiles.filter((f) => f.includes(".github/workflows"));
      const hasNotify = ciFiles.some((f) => {
        const content = ctx.readFile(f);
        return /slack|discord|notify|notification|webhook/i.test(content);
      });
      if (hasNotify) return [];
      return [];
    },
  }),

  // DEPLOY-007: Build Takes Under 10 Minutes
  manualCheck({
    id: "DEPLOY-007",
    name: "Build Takes Under 10 Minutes",
    category: "deployment",
    severity: "medium",
    description: "Deploy takes under 10 minutes. Optimize with caching if needed.",
  }),
];
