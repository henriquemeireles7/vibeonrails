/**
 * Security Essentials Checks (SEC-001 through SEC-015)
 *
 * From vibeaudit.md: Beyond the Top 30, these protect users and business.
 */

import type { AuditCheck } from "../types.js";
import { patternCheck, configCheck, manualCheck } from "../helpers.js";

export const securityChecks: AuditCheck[] = [
  // SEC-001: CSRF Protection
  configCheck({
    id: "SEC-001",
    name: "CSRF Protection",
    category: "security",
    severity: "high",
    description:
      "All state-changing forms and API endpoints validate CSRF tokens or use SameSite cookies.",
    validate: (ctx) => {
      const hasCsrf = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /csrf|csrfToken|SameSite|xsrf/i.test(content);
      });
      if (hasCsrf) return [];
      return [
        {
          file: "",
          message: "No CSRF protection detected",
          suggestion: "Add CSRF token validation or SameSite cookie attributes",
        },
      ];
    },
  }),

  // SEC-002: Password Reset Tokens
  configCheck({
    id: "SEC-002",
    name: "Password Reset Tokens Are Secure",
    category: "security",
    severity: "high",
    description:
      "Reset tokens expire in < 1 hour, are single-use, and cryptographically random.",
    validate: (ctx) => {
      const resetFiles = ctx.sourceFiles.filter((f) => {
        const content = ctx.readFile(f);
        return /password.*reset|reset.*password|forgotPassword/i.test(content);
      });
      if (resetFiles.length === 0) return [];
      for (const file of resetFiles) {
        const content = ctx.readFile(file);
        if (!/crypto\.random|randomBytes|randomUUID|nanoid/i.test(content)) {
          return [
            {
              file,
              message: "Password reset may not use cryptographically random tokens",
              suggestion: "Use crypto.randomBytes or equivalent for reset tokens",
            },
          ];
        }
      }
      return [];
    },
  }),

  // SEC-003: Account Enumeration Prevention
  configCheck({
    id: "SEC-003",
    name: "Account Enumeration Prevention",
    category: "security",
    severity: "medium",
    description:
      "Login, registration, and password reset don't reveal whether a specific email exists.",
    validate: (ctx) => {
      const authFiles = ctx.sourceFiles.filter((f) => {
        const content = ctx.readFile(f);
        return /login|register|signUp|sign-up|password.*reset/i.test(content);
      });
      for (const file of authFiles) {
        const content = ctx.readFile(file);
        if (/email.*not found|user.*not found|no account|email.*already.*exist/i.test(content)) {
          return [
            {
              file,
              message: "Auth response may reveal account existence",
              suggestion: "Use generic messages like 'Invalid credentials'",
            },
          ];
        }
      }
      return [];
    },
  }),

  // SEC-004: Secure Cookie Flags
  configCheck({
    id: "SEC-004",
    name: "Secure Cookie Flags",
    category: "security",
    severity: "high",
    description:
      "Session cookies use Secure, HttpOnly, and SameSite attributes.",
    validate: (ctx) => {
      const cookieFiles = ctx.sourceFiles.filter((f) => {
        const content = ctx.readFile(f);
        return /cookie|setCookie|set-cookie/i.test(content);
      });
      if (cookieFiles.length === 0) return [];
      for (const file of cookieFiles) {
        const content = ctx.readFile(file);
        if (/setCookie|cookie/i.test(content) && !/httpOnly|secure|sameSite/i.test(content)) {
          return [
            {
              file,
              message: "Cookie set without secure flags",
              suggestion: "Add httpOnly, secure, and sameSite flags to cookies",
            },
          ];
        }
      }
      return [];
    },
  }),

  // SEC-005: Open Redirect Prevention
  patternCheck({
    id: "SEC-005",
    name: "Open Redirect Prevention",
    category: "security",
    severity: "medium",
    description:
      "Redirect URLs are validated against an allowlist.",
    pattern: /redirect\s*\(\s*(?:req\.query|req\.params|req\.body|searchParams)/i,
    message: "Possible open redirect: redirecting to user-supplied URL",
    suggestion: "Validate redirect URLs against an allowlist",
  }),

  // SEC-006: Admin Panel Protection
  configCheck({
    id: "SEC-006",
    name: "Admin Panel Protection",
    category: "security",
    severity: "high",
    description:
      "Admin routes have additional authentication and are not discoverable via URL guessing.",
    validate: (ctx) => {
      const adminFiles = ctx.sourceFiles.filter(
        (f) => f.includes("admin") || f.includes("Admin"),
      );
      if (adminFiles.length === 0) return [];
      for (const file of adminFiles) {
        const content = ctx.readFile(file);
        if (!/requireRole|isAdmin|role.*admin|protectedProcedure|requireAuth/i.test(content)) {
          return [
            {
              file,
              message: "Admin route may lack role-based protection",
              suggestion: "Add admin role check to all admin routes",
            },
          ];
        }
      }
      return [];
    },
  }),

  // SEC-007: API Keys Are Scoped
  manualCheck({
    id: "SEC-007",
    name: "API Keys Are Scoped",
    category: "security",
    severity: "medium",
    description:
      "If you issue API keys, each key has limited permissions.",
  }),

  // SEC-008: Mass Assignment Protection
  patternCheck({
    id: "SEC-008",
    name: "Mass Assignment Protection",
    category: "security",
    severity: "high",
    description:
      "API endpoints use explicit field allowlists. Users can't set role or plan fields.",
    pattern: /\.create\(\s*req\.body\s*\)|\.update\(\s*req\.body\s*\)|Object\.assign\(\s*\w+,\s*req\.body/,
    message: "Possible mass assignment: passing raw request body to create/update",
    suggestion: "Use explicit field allowlists when creating/updating records",
  }),

  // SEC-009: Dependency Post-Install Scripts
  manualCheck({
    id: "SEC-009",
    name: "Dependency Post-Install Script Audit",
    category: "security",
    severity: "medium",
    description:
      "No npm/pip dependency runs suspicious post-install scripts.",
  }),

  // SEC-010: No Sensitive Data in URLs
  patternCheck({
    id: "SEC-010",
    name: "No Sensitive Data in URLs",
    category: "security",
    severity: "medium",
    description:
      "Tokens and API keys are sent in headers or body, never in URL query strings.",
    pattern: /\?.*(?:token|api_key|apiKey|secret|password)=/i,
    message: "Sensitive data may be passed in URL query parameters",
    suggestion: "Send tokens and keys in headers or request body",
  }),

  // SEC-011: Content Security Policy
  configCheck({
    id: "SEC-011",
    name: "Content Security Policy Exists",
    category: "security",
    severity: "medium",
    description:
      "CSP header prevents inline script execution at minimum.",
    validate: (ctx) => {
      const hasCsp = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /content-security-policy|secureHeaders|contentSecurityPolicy|csp/i.test(content);
      });
      if (hasCsp) return [];
      return [
        {
          file: "",
          message: "No Content Security Policy detected",
          suggestion: "Add CSP headers to prevent XSS attacks",
        },
      ];
    },
  }),

  // SEC-012: SSRF Protection
  configCheck({
    id: "SEC-012",
    name: "SSRF Protection",
    category: "security",
    severity: "high",
    description:
      "Features accepting user URLs block requests to internal IPs.",
    validate: (ctx) => {
      const urlInputFiles = ctx.sourceFiles.filter((f) => {
        const content = ctx.readFile(f);
        return /fetch\s*\(\s*(?:url|userUrl|inputUrl|req\.body\.url)/i.test(content);
      });
      if (urlInputFiles.length === 0) return [];
      for (const file of urlInputFiles) {
        const content = ctx.readFile(file);
        if (!/(?:127\.0\.0\.1|10\.|192\.168|169\.254|localhost|isPrivateIP|validateUrl)/i.test(content)) {
          return [
            {
              file,
              message: "User-supplied URL fetching without SSRF protection",
              suggestion: "Block requests to internal/private IP ranges",
            },
          ];
        }
      }
      return [];
    },
  }),

  // SEC-013: Email Verification
  configCheck({
    id: "SEC-013",
    name: "Email Verification Exists",
    category: "security",
    severity: "medium",
    description:
      "Account creation requires email verification before full access.",
    validate: (ctx) => {
      const hasVerification = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /emailVerif|verifyEmail|confirmEmail|email.*confirm|verification.*token/i.test(
          content,
        );
      });
      if (hasVerification) return [];
      return [
        {
          file: "",
          message: "No email verification flow detected",
          suggestion: "Add email verification for new account registrations",
        },
      ];
    },
  }),

  // SEC-014: Logout Works Completely
  configCheck({
    id: "SEC-014",
    name: "Logout Works Completely",
    category: "security",
    severity: "medium",
    description:
      "Logout invalidates session server-side, clears tokens, returns 401 on old tokens.",
    validate: (ctx) => {
      const hasLogout = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /logout|signOut|sign-out/i.test(content);
      });
      if (hasLogout) return [];
      return [
        {
          file: "",
          message: "No logout implementation detected",
          suggestion: "Implement server-side session invalidation on logout",
        },
      ];
    },
  }),

  // SEC-015: Security Headers
  configCheck({
    id: "SEC-015",
    name: "Security Headers Are Set",
    category: "security",
    severity: "medium",
    description:
      "X-Content-Type-Options, X-Frame-Options, Referrer-Policy headers are set.",
    validate: (ctx) => {
      const hasHeaders = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /secureHeaders|x-content-type|x-frame-options|referrer-policy|helmet/i.test(
          content,
        );
      });
      if (hasHeaders) return [];
      return [
        {
          file: "",
          message: "No security headers configuration detected",
          suggestion: "Add security headers middleware (helmet, hono/secure-headers)",
        },
      ];
    },
  }),
];
