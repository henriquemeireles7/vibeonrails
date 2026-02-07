/**
 * Performance Checks (PERF-001 through PERF-015)
 *
 * From vibeaudit.md: Performance issues that actually lose users.
 */

import type { AuditCheck } from "../types.js";
import { patternCheck, configCheck, manualCheck } from "../helpers.js";

export const performanceChecks: AuditCheck[] = [
  // PERF-001: Database Connection Pooling
  configCheck({
    id: "PERF-001",
    name: "Database Connection Pooling",
    category: "performance",
    severity: "high",
    description: "Database connections use a pool with appropriate size.",
    validate: (ctx) => {
      const dbFiles = ctx.sourceFiles.filter((f) => {
        const content = ctx.readFile(f);
        return /database|drizzle|prisma|knex|pg\b|mysql|sequelize/i.test(content);
      });
      if (dbFiles.length === 0) return [];
      const hasPool = dbFiles.some((f) => {
        const content = ctx.readFile(f);
        return /pool|connectionPool|poolSize|max.*connection/i.test(content);
      });
      if (hasPool) return [];
      return [{ file: "", message: "No database connection pooling detected", suggestion: "Configure connection pool for your database driver" }];
    },
  }),

  // PERF-002: API Responses Under 500ms
  manualCheck({
    id: "PERF-002",
    name: "API Responses Under 500ms",
    category: "performance",
    severity: "high",
    description: "The 10 most-hit API endpoints respond in under 500ms P95.",
  }),

  // PERF-003: No Synchronous External Calls in Hot Paths
  patternCheck({
    id: "PERF-003",
    name: "No Sync External Calls in Hot Paths",
    category: "performance",
    severity: "high",
    description: "Hot path pages don't synchronously call external APIs.",
    pattern: /(?:readFileSync|execSync|spawnSync)\s*\(/,
    fileFilter: (f) => f.includes("route") || f.includes("handler") || f.includes("controller") || f.includes("middleware"),
    message: "Synchronous blocking call in request handler",
    suggestion: "Use async alternatives (readFile, exec) in request handlers",
  }),

  // PERF-004: JavaScript Bundle Under 300KB
  manualCheck({
    id: "PERF-004",
    name: "JavaScript Bundle Under 300KB Gzipped",
    category: "performance",
    severity: "medium",
    description: "Total JS on initial page load is under 300KB gzipped.",
  }),

  // PERF-005: Fonts Don't Block Rendering
  configCheck({
    id: "PERF-005",
    name: "Fonts Don't Block Rendering",
    category: "performance",
    severity: "medium",
    description: "Web fonts use font-display: swap or optional.",
    validate: (ctx) => {
      const cssFiles = ctx.allFiles.filter((f) => f.endsWith(".css"));
      const hasFontFace = cssFiles.some((f) => ctx.readFile(f).includes("@font-face"));
      if (!hasFontFace) return [];
      const hasSwap = cssFiles.some((f) => /font-display\s*:\s*(swap|optional)/i.test(ctx.readFile(f)));
      if (hasSwap) return [];
      return [{ file: "", message: "Web fonts may block rendering", suggestion: "Add font-display: swap to @font-face declarations" }];
    },
  }),

  // PERF-006: Static Assets on CDN
  manualCheck({
    id: "PERF-006",
    name: "Static Assets on CDN",
    category: "performance",
    severity: "high",
    description: "Images, JS, CSS, and fonts are served from a CDN.",
  }),

  // PERF-007: No Memory Leaks
  manualCheck({
    id: "PERF-007",
    name: "No Memory Leaks in Long-Running Processes",
    category: "performance",
    severity: "high",
    description: "Memory usage stays stable over 24+ hours.",
  }),

  // PERF-008: Pagination on All Lists
  configCheck({
    id: "PERF-008",
    name: "Pagination on All Lists",
    category: "performance",
    severity: "high",
    description: "Every list in UI and API uses pagination or infinite scroll.",
    validate: (ctx) => {
      const listFiles = ctx.sourceFiles.filter((f) => {
        const content = ctx.readFile(f);
        return /\.findMany|\.select\(\)\.from|SELECT.*FROM/i.test(content);
      });
      if (listFiles.length === 0) return [];
      const findings: Array<{ file: string; message: string; suggestion?: string }> = [];
      for (const file of listFiles) {
        const content = ctx.readFile(file);
        if (!/limit|offset|cursor|page|pagination|skip|take/i.test(content)) {
          findings.push({ file, message: "List query without pagination", suggestion: "Add limit/offset or cursor-based pagination" });
        }
      }
      return findings;
    },
  }),

  // PERF-009: Heavy Operations Are Async
  configCheck({
    id: "PERF-009",
    name: "Heavy Operations Are Async",
    category: "performance",
    severity: "high",
    description: "Email, image processing, PDF generation happen in background jobs.",
    validate: (ctx) => {
      const pkg = ctx.packageJson;
      if (!pkg) return [];
      const deps = { ...(pkg.dependencies as Record<string, string> | undefined) };
      const hasQueue = ["bullmq", "bull", "bee-queue", "agenda", "pg-boss", "@vibeonrails/infra"].some((d) => d in deps);
      if (hasQueue) return [];
      const hasQueueRef = ctx.sourceFiles.some((f) => /queue|worker|job|background/i.test(ctx.readFile(f)));
      if (hasQueueRef) return [];
      return [{ file: "", message: "No background job/queue system detected", suggestion: "Use BullMQ or equivalent for heavy async operations" }];
    },
  }),

  // PERF-010: Mobile Performance Tested
  manualCheck({
    id: "PERF-010",
    name: "Mobile Performance Tested",
    category: "performance",
    severity: "high",
    description: "Core flows tested on real mid-range phone or throttled Chrome DevTools.",
  }),

  // PERF-011: Timeouts on All External Calls
  configCheck({
    id: "PERF-011",
    name: "Timeouts on All External Calls",
    category: "performance",
    severity: "high",
    description: "Every HTTP request, DB query, and API call has an explicit timeout.",
    validate: (ctx) => {
      const fetchFiles = ctx.sourceFiles.filter((f) => {
        const content = ctx.readFile(f);
        return /fetch\(|axios\(|got\(|ky\(|http\.request/i.test(content);
      });
      if (fetchFiles.length === 0) return [];
      const findings: Array<{ file: string; message: string; suggestion?: string }> = [];
      for (const file of fetchFiles) {
        const content = ctx.readFile(file);
        if (!/timeout|signal.*abort|AbortController/i.test(content)) {
          findings.push({ file, message: "External HTTP call without explicit timeout", suggestion: "Add timeout or AbortController signal" });
        }
      }
      return findings;
    },
  }),

  // PERF-012: Gzip/Brotli Compression Enabled
  configCheck({
    id: "PERF-012",
    name: "Gzip/Brotli Compression Enabled",
    category: "performance",
    severity: "medium",
    description: "HTTP responses are compressed.",
    validate: (ctx) => {
      const hasCompression = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /compress|brotli|gzip|deflate|Content-Encoding/i.test(content);
      });
      if (hasCompression) return [];
      return [{ file: "", message: "No HTTP compression detected", suggestion: "Enable gzip or Brotli compression for HTTP responses" }];
    },
  }),

  // PERF-013: No SELECT * in Production Queries
  patternCheck({
    id: "PERF-013",
    name: "No SELECT * in Production Queries",
    category: "performance",
    severity: "medium",
    description: "Queries select only needed columns.",
    pattern: /SELECT\s+\*\s+FROM/i,
    fileFilter: (f) => !f.includes(".test.") && !f.includes("migration"),
    message: "SELECT * found in production code",
    suggestion: "Select only needed columns to reduce data transfer",
  }),

  // PERF-014: Caching for Repeated Reads
  configCheck({
    id: "PERF-014",
    name: "Caching for Repeated Reads",
    category: "performance",
    severity: "medium",
    description: "Rarely-changing data is cached with appropriate TTL.",
    validate: (ctx) => {
      const hasCache = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /cache|redis|memcached|lru|Map\(\)|ttl/i.test(content);
      });
      if (hasCache) return [];
      return [{ file: "", message: "No caching strategy detected", suggestion: "Add caching for frequently-read, rarely-changed data" }];
    },
  }),

  // PERF-015: Third-Party Scripts Loaded Async
  configCheck({
    id: "PERF-015",
    name: "Third-Party Scripts Loaded Async",
    category: "performance",
    severity: "medium",
    description: "All analytics and tracking scripts load with async or defer.",
    validate: (ctx) => {
      const htmlFiles = ctx.allFiles.filter((f) => f.endsWith(".html") || f.endsWith(".tsx") || f.endsWith(".jsx"));
      const findings: Array<{ file: string; message: string; suggestion?: string }> = [];
      for (const file of htmlFiles) {
        const content = ctx.readFile(file);
        const scriptMatches = content.match(/<script[^>]*src=[^>]*>/g) ?? [];
        for (const tag of scriptMatches) {
          if (/https?:\/\//.test(tag) && !/async|defer/.test(tag)) {
            findings.push({ file, message: "Third-party script loaded without async/defer", suggestion: "Add async or defer attribute" });
          }
        }
      }
      return findings;
    },
  }),
];
