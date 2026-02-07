/**
 * Top 30 Non-Negotiable Checks (TOP-001 through TOP-030)
 *
 * From vibeaudit.md: "These are ranked by probability of ruining your business"
 */

import type { AuditCheck } from "../types.js";
import {
  patternCheck,
  missingPatternCheck,
  fileExistsCheck,
  configCheck,
  manualCheck,
} from "../helpers.js";

export const top30Checks: AuditCheck[] = [
  // TOP-001: Backups Exist and Are Tested
  manualCheck({
    id: "TOP-001",
    name: "Backups Exist and Are Tested",
    category: "top30",
    severity: "critical",
    description:
      "Database has automated daily backups. You have personally restored from a backup at least once.",
  }),

  // TOP-002: Payment Flow Works End-to-End
  manualCheck({
    id: "TOP-002",
    name: "Payment Flow Works End-to-End",
    category: "top30",
    severity: "critical",
    description:
      "Signup, payment, access grant, renewal, cancellation, and access revoke has been manually tested.",
  }),

  // TOP-003: No Hardcoded Secrets
  patternCheck({
    id: "TOP-003",
    name: "No Hardcoded Secrets",
    category: "top30",
    severity: "critical",
    description:
      "Zero API keys, database passwords, Stripe keys, or tokens in source code.",
    pattern:
      /(?:api[_-]?key|secret[_-]?key|password|stripe[_-]?(?:sk|pk)|token|auth[_-]?token|private[_-]?key|database[_-]?url|db[_-]?password)\s*[:=]\s*['"][a-zA-Z0-9_\-/.]{8,}['"]/i,
    message: "Possible hardcoded secret found",
    suggestion: "Move to environment variables or a secret manager",
    autoFixable: false,
  }),

  // TOP-004: Authentication is Not Homegrown
  configCheck({
    id: "TOP-004",
    name: "Authentication is Not Homegrown",
    category: "top30",
    severity: "critical",
    description:
      "Using a proven auth library, not a custom auth system. Password hashing uses bcrypt/Argon2.",
    validate: (ctx) => {
      const pkg = ctx.packageJson;
      if (!pkg) return [{ file: "package.json", message: "No package.json found" }];
      const deps = {
        ...(pkg.dependencies as Record<string, string> | undefined),
        ...(pkg.devDependencies as Record<string, string> | undefined),
      };
      const authLibs = [
        "next-auth", "@auth/core", "lucia", "clerk", "@clerk/nextjs",
        "passport", "jose", "jsonwebtoken", "argon2", "bcrypt", "bcryptjs",
        "@supabase/supabase-js", "@vibeonrails/core",
      ];
      const hasAuth = authLibs.some((lib) => lib in deps);
      if (hasAuth) return [];
      return [
        {
          file: "package.json",
          message: "No recognized auth library found in dependencies",
          suggestion: "Use a proven auth solution (jose, next-auth, passport, etc.)",
        },
      ];
    },
  }),

  // TOP-005: Authorization on Every Endpoint
  configCheck({
    id: "TOP-005",
    name: "Authorization on Every Endpoint",
    category: "top30",
    severity: "critical",
    description:
      "Every API route that returns or modifies user data checks that the requesting user owns that data.",
    validate: (ctx) => {
      const findings: Array<{ file: string; message: string; suggestion?: string }> = [];
      const routeFiles = ctx.sourceFiles.filter(
        (f) =>
          f.includes("route") ||
          f.includes("handler") ||
          f.includes("controller") ||
          f.includes("router") ||
          f.includes("procedure"),
      );
      for (const file of routeFiles) {
        const content = ctx.readFile(file);
        const hasAuth =
          /protectedProcedure|requireAuth|isAuthenticated|authMiddleware|requireRole|requireOwnership|session\.user|ctx\.user/i.test(
            content,
          );
        if (!hasAuth && content.length > 50) {
          findings.push({
            file,
            message: "Route file may lack authorization checks",
            suggestion: "Add auth middleware or protectedProcedure",
          });
        }
      }
      return findings;
    },
  }),

  // TOP-006: SQL Injection Prevention
  patternCheck({
    id: "TOP-006",
    name: "SQL Injection Prevention",
    category: "top30",
    severity: "critical",
    description:
      "All database queries use parameterized queries or an ORM. No string concatenation in queries.",
    pattern:
      /(?:execute|query|raw)\s*\(\s*`[^`]*\$\{/,
    message: "Possible SQL injection: template literal in database query",
    suggestion: "Use parameterized queries or ORM methods instead",
  }),

  // TOP-007: HTTPS Everywhere
  manualCheck({
    id: "TOP-007",
    name: "HTTPS Everywhere",
    category: "top30",
    severity: "critical",
    description:
      "All traffic is served over HTTPS. HTTP redirects to HTTPS.",
  }),

  // TOP-008: Error Boundaries Don't Show Stack Traces
  patternCheck({
    id: "TOP-008",
    name: "Error Boundaries Hide Stack Traces",
    category: "top30",
    severity: "critical",
    description:
      "Production errors show friendly messages, not internal stack traces.",
    pattern:
      /(?:res\.(?:send|json|status)\s*\(.*(?:stack|stackTrace|err\.message)|error\.stack\s*\))/,
    fileFilter: (f) => !f.includes(".test.") && !f.includes("__tests__"),
    message: "Possible stack trace exposure in error response",
    suggestion: "Return generic error messages in production",
  }),

  // TOP-009: Input Validation on Server Side
  configCheck({
    id: "TOP-009",
    name: "Input Validation on Server Side",
    category: "top30",
    severity: "critical",
    description:
      "All user inputs are validated on the server for type, length, and format.",
    validate: (ctx) => {
      const pkg = ctx.packageJson;
      if (!pkg) return [];
      const deps = {
        ...(pkg.dependencies as Record<string, string> | undefined),
      };
      const validationLibs = ["zod", "joi", "yup", "class-validator", "superstruct", "valibot"];
      const hasValidation = validationLibs.some((lib) => lib in deps);
      if (hasValidation) return [];
      return [
        {
          file: "package.json",
          message: "No server-side validation library found",
          suggestion: "Add Zod, Joi, or equivalent for input validation",
        },
      ];
    },
  }),

  // TOP-010: XSS Prevention
  patternCheck({
    id: "TOP-010",
    name: "XSS Prevention",
    category: "top30",
    severity: "critical",
    description:
      "User-generated content is escaped/sanitized. No dangerouslySetInnerHTML with unsanitized data.",
    pattern: /dangerouslySetInnerHTML|v-html\s*=|innerHTML\s*=/,
    message: "Potential XSS: unsafe HTML rendering detected",
    suggestion: "Use a sanitization library (DOMPurify) or escape HTML",
  }),

  // TOP-011: Rate Limiting on Auth Endpoints
  configCheck({
    id: "TOP-011",
    name: "Rate Limiting on Auth Endpoints",
    category: "top30",
    severity: "high",
    description:
      "Login, registration, password reset endpoints have rate limiting.",
    validate: (ctx) => {
      const hasRateLimit = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /rateLimit|rateLimiter|rate-limit|throttle/i.test(content);
      });
      if (hasRateLimit) return [];
      return [
        {
          file: "",
          message: "No rate limiting detected in codebase",
          suggestion: "Add rate limiting to auth endpoints",
        },
      ];
    },
  }),

  // TOP-012: Database Has Indexes on Queried Columns
  configCheck({
    id: "TOP-012",
    name: "Database Indexes on Queried Columns",
    category: "top30",
    severity: "critical",
    description:
      "Every column used in WHERE, JOIN, or ORDER BY has an index.",
    validate: (ctx) => {
      const schemaFiles = ctx.sourceFiles.filter(
        (f) => f.includes("schema") && f.endsWith(".ts"),
      );
      if (schemaFiles.length === 0) return [];
      const hasIndexes = schemaFiles.some((f) => {
        const content = ctx.readFile(f);
        return /index\(|\.index\s*\(|createIndex|uniqueIndex/i.test(content);
      });
      if (hasIndexes) return [];
      return [
        {
          file: schemaFiles[0] ?? "",
          message: "No database indexes detected in schema files",
          suggestion: "Add indexes to columns used in WHERE/JOIN/ORDER BY",
        },
      ];
    },
  }),

  // TOP-013: No N+1 Queries
  patternCheck({
    id: "TOP-013",
    name: "No N+1 Queries",
    category: "top30",
    severity: "critical",
    description:
      "List pages use eager loading or JOINs, not individual queries per item.",
    pattern:
      /for\s*\([^)]*\)\s*\{[^}]*(?:await\s+(?:db|prisma|knex|drizzle)\.|\.findOne|\.findUnique|\.findFirst|\.query\()/,
    message: "Possible N+1 query: database call inside a loop",
    suggestion: "Use eager loading, JOINs, or batch queries instead",
  }),

  // TOP-014: Pages Load in Under 3 Seconds
  manualCheck({
    id: "TOP-014",
    name: "Pages Load in Under 3 Seconds",
    category: "top30",
    severity: "critical",
    description:
      "Core pages load in under 3 seconds on a 4G mobile connection.",
  }),

  // TOP-015: Deployment is Automated
  configCheck({
    id: "TOP-015",
    name: "Deployment is Automated",
    category: "top30",
    severity: "high",
    description:
      "Pushing to main automatically builds and deploys. Rollback takes under 5 minutes.",
    validate: (ctx) => {
      const ciFiles = [
        ".github/workflows",
        ".gitlab-ci.yml",
        "Jenkinsfile",
        "vercel.json",
        "netlify.toml",
        "railway.json",
        "fly.toml",
        "render.yaml",
        "Dockerfile",
      ];
      const hasCI = ciFiles.some((f) => ctx.fileExists(f));
      if (hasCI) return [];
      const hasCIDir = ctx.allFiles.some((f) => f.startsWith(".github/"));
      if (hasCIDir) return [];
      return [
        {
          file: "",
          message: "No CI/CD configuration detected",
          suggestion: "Add GitHub Actions, Vercel, or equivalent CI/CD config",
        },
      ];
    },
  }),

  // TOP-016: Core User Flows Have Tests
  configCheck({
    id: "TOP-016",
    name: "Core User Flows Have Tests",
    category: "top30",
    severity: "high",
    description:
      "Signup, login, payment, and primary feature each have at least one test.",
    validate: (ctx) => {
      if (ctx.testFiles.length === 0) {
        return [{ file: "", message: "No test files found in the project" }];
      }
      return [];
    },
  }),

  // TOP-017: Monitoring and Alerting Exists
  manualCheck({
    id: "TOP-017",
    name: "Monitoring and Alerting Exists",
    category: "top30",
    severity: "high",
    description:
      "You receive alerts when the app is down, error rate spikes, or payment webhooks fail.",
  }),

  // TOP-018: Environment Separation
  configCheck({
    id: "TOP-018",
    name: "Environment Separation",
    category: "top30",
    severity: "high",
    description:
      "Dev, staging, and production are separate environments. Production DB is never used for testing.",
    validate: (ctx) => {
      const envFiles = ctx.allFiles.filter((f) =>
        /^\.env(\.(local|development|staging|production|test|example))?$/.test(f),
      );
      if (envFiles.length >= 2) return [];
      const hasEnvCheck = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /NODE_ENV|process\.env\.NODE_ENV|import\.meta\.env/.test(content);
      });
      if (hasEnvCheck) return [];
      return [
        {
          file: "",
          message: "No environment separation detected",
          suggestion: "Create separate .env files for dev/staging/production",
        },
      ];
    },
  }),

  // TOP-019: Sensitive Data Not Over-Exposed in APIs
  patternCheck({
    id: "TOP-019",
    name: "APIs Don't Over-Expose Data",
    category: "top30",
    severity: "high",
    description:
      "API responses only return fields the client actually uses.",
    pattern: /select\s*\(\s*\)\s*\.from|SELECT\s+\*\s+FROM/i,
    message: "Possible over-exposure: SELECT * or select() without columns",
    suggestion: "Explicitly select only needed columns",
  }),

  // TOP-020: File Uploads Are Restricted
  configCheck({
    id: "TOP-020",
    name: "File Uploads Are Restricted",
    category: "top30",
    severity: "high",
    description:
      "Uploads validated by type (magic bytes), limited in size, stored outside webroot.",
    validate: (ctx) => {
      const uploadFiles = ctx.sourceFiles.filter((f) => {
        const content = ctx.readFile(f);
        return /upload|multer|formidable|busboy|multipart/i.test(content);
      });
      if (uploadFiles.length === 0) return []; // No upload handling = N/A
      for (const file of uploadFiles) {
        const content = ctx.readFile(file);
        if (!/maxFileSize|fileSize|limit|maxSize|sizeLimit/i.test(content)) {
          return [
            {
              file,
              message: "File upload handler found without size limit",
              suggestion: "Add file size limits and type validation",
            },
          ];
        }
      }
      return [];
    },
  }),

  // TOP-021: No console.log Sensitive Data
  patternCheck({
    id: "TOP-021",
    name: "No console.log Sensitive Data",
    category: "top30",
    severity: "high",
    description:
      "No console.log statements output tokens, passwords, user data, or API keys.",
    pattern:
      /console\.log\s*\([^)]*(?:token|password|secret|apiKey|auth|credential|session)/i,
    fileFilter: (f) => !f.includes(".test.") && !f.includes("__tests__"),
    message: "console.log may expose sensitive data",
    suggestion: "Remove or replace with structured logging that redacts sensitive fields",
    autoFixable: true,
  }),

  // TOP-022: Dependencies Are Not Wildly Outdated
  configCheck({
    id: "TOP-022",
    name: "Dependencies Not Outdated",
    category: "top30",
    severity: "high",
    description:
      "No dependencies have known CRITICAL or HIGH CVEs.",
    validate: (ctx) => {
      const lockFiles = ["pnpm-lock.yaml", "package-lock.json", "yarn.lock"];
      const hasLock = lockFiles.some((f) => ctx.fileExists(f));
      if (!hasLock) {
        return [
          {
            file: "",
            message: "No lock file found; dependency versions are unpinned",
            suggestion: "Run your package manager to generate a lock file",
          },
        ];
      }
      return [];
    },
  }),

  // TOP-023: Images Are Optimized
  manualCheck({
    id: "TOP-023",
    name: "Images Are Optimized",
    category: "top30",
    severity: "high",
    description:
      "Images served in WebP/AVIF, sized appropriately, and lazy-loaded below the fold.",
  }),

  // TOP-024: Webhooks Are Idempotent
  configCheck({
    id: "TOP-024",
    name: "Webhooks Are Idempotent",
    category: "top30",
    severity: "critical",
    description:
      "All webhook handlers can safely receive the same event multiple times.",
    validate: (ctx) => {
      const webhookFiles = ctx.sourceFiles.filter((f) => {
        const content = ctx.readFile(f);
        return /webhook/i.test(f) || /webhook/i.test(content);
      });
      if (webhookFiles.length === 0) return [];
      for (const file of webhookFiles) {
        const content = ctx.readFile(file);
        if (!/idempoten|eventId|event_id|processed.*event|dedup/i.test(content)) {
          return [
            {
              file,
              message: "Webhook handler may not be idempotent",
              suggestion: "Add idempotency checks to prevent duplicate processing",
            },
          ];
        }
      }
      return [];
    },
  }),

  // TOP-025: CORS is Not Wildcard
  patternCheck({
    id: "TOP-025",
    name: "CORS is Not Wildcard",
    category: "top30",
    severity: "high",
    description:
      "CORS configured to specific origins, not *.",
    pattern: /cors\s*\(\s*\{[^}]*origin\s*:\s*['"]\*['"]/,
    message: "CORS configured with wildcard origin",
    suggestion: "Set CORS origin to specific trusted domains",
  }),

  // TOP-026: Database Migrations Are Version-Controlled
  configCheck({
    id: "TOP-026",
    name: "Database Migrations Version-Controlled",
    category: "top30",
    severity: "high",
    description:
      "Schema changes are in migration files committed to git.",
    validate: (ctx) => {
      const hasMigrations = ctx.allFiles.some(
        (f) =>
          f.includes("migration") ||
          f.includes("migrate") ||
          f.includes("drizzle/"),
      );
      if (hasMigrations) return [];
      const hasSchema = ctx.sourceFiles.some((f) => f.includes("schema"));
      if (hasSchema) return [];
      return [
        {
          file: "",
          message: "No database migration files detected",
          suggestion: "Use versioned migrations (Drizzle, Prisma, or raw SQL files)",
        },
      ];
    },
  }),

  // TOP-027: The README Actually Works
  fileExistsCheck({
    id: "TOP-027",
    name: "README Actually Works",
    category: "top30",
    severity: "medium",
    description:
      "A new developer can go from git clone to running the app in under 30 minutes.",
    files: ["README.md"],
    message: "README.md is missing or incomplete",
    suggestion: "Create a README with setup instructions",
  }),

  // TOP-028: No Unbounded Queries
  configCheck({
    id: "TOP-028",
    name: "No Unbounded Queries",
    category: "top30",
    severity: "high",
    description:
      "Every endpoint returning a list has a maximum limit enforced server-side.",
    validate: (ctx) => {
      const findings: Array<{ file: string; message: string; suggestion?: string }> = [];
      const repoFiles = ctx.sourceFiles.filter(
        (f) =>
          f.includes("repo") ||
          f.includes("service") ||
          f.includes("handler") ||
          f.includes("controller"),
      );
      for (const file of repoFiles) {
        const content = ctx.readFile(file);
        if (/\.findMany|\.select\(\)/.test(content) && !/\.limit\(|take:|limit:/.test(content)) {
          findings.push({
            file,
            message: "Query may return unbounded results",
            suggestion: "Add .limit() or pagination to list queries",
          });
        }
      }
      return findings;
    },
  }),

  // TOP-029: Session/Token Expiry is Configured
  configCheck({
    id: "TOP-029",
    name: "Session/Token Expiry Configured",
    category: "top30",
    severity: "high",
    description:
      "JWTs or session tokens expire. Refresh tokens exist if access tokens are short-lived.",
    validate: (ctx) => {
      const hasExpiry = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /expiresIn|exp:|maxAge|ttl|token.*expir/i.test(content);
      });
      if (hasExpiry) return [];
      return [
        {
          file: "",
          message: "No token/session expiry configuration detected",
          suggestion: "Configure JWT expiry and refresh token rotation",
        },
      ];
    },
  }),

  // TOP-030: Break Glass Plan
  manualCheck({
    id: "TOP-030",
    name: "Break Glass Plan Exists",
    category: "top30",
    severity: "high",
    description:
      "You know how to SSH, rollback, disable features, ban users, and restore backups.",
  }),
];
