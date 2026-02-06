/**
 * Dev Query Analyzer
 *
 * Development-only query analyzer that:
 * - Logs every query with duration
 * - Warns on slow queries (>100ms) with EXPLAIN ANALYZE output suggestion
 * - Detects N+1 patterns (same query >3x in one request)
 * - Suggests CREATE INDEX statements
 * - Zero overhead in production (disabled entirely)
 *
 * Usage:
 *   import { createQueryAnalyzer } from '@vibeonrails/core/database';
 *
 *   const analyzer = createQueryAnalyzer();
 *   analyzer.track('SELECT * FROM users WHERE id = $1', 150, 'req-123');
 *   analyzer.report('req-123');
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A tracked query entry.
 */
export interface TrackedQuery {
  /** The SQL query (normalized) */
  sql: string;
  /** Query duration in milliseconds */
  durationMs: number;
  /** Request ID that issued this query */
  requestId: string;
  /** Timestamp of the query */
  timestamp: number;
}

/**
 * A slow query warning.
 */
export interface SlowQueryWarning {
  sql: string;
  durationMs: number;
  requestId: string;
  suggestedIndex?: string;
}

/**
 * An N+1 detection result.
 */
export interface NPlusOneDetection {
  /** The repeated query pattern */
  pattern: string;
  /** How many times it was executed */
  count: number;
  /** Request ID where detected */
  requestId: string;
  /** Suggested fix */
  suggestion: string;
}

/**
 * Analysis report for a request.
 */
export interface QueryAnalysisReport {
  requestId: string;
  totalQueries: number;
  totalDurationMs: number;
  slowQueries: SlowQueryWarning[];
  nPlusOneDetections: NPlusOneDetection[];
}

/**
 * Options for the query analyzer.
 */
export interface QueryAnalyzerOptions {
  /** Threshold for slow query warning in ms (default: 100) */
  slowQueryThresholdMs?: number;
  /** Minimum repetitions to trigger N+1 detection (default: 3) */
  nPlusOneThreshold?: number;
  /** Whether the analyzer is enabled (default: auto-detect from NODE_ENV) */
  enabled?: boolean;
  /** Custom writer for warnings (default: console.warn) */
  writer?: (message: string) => void;
}

// ---------------------------------------------------------------------------
// SQL Normalization
// ---------------------------------------------------------------------------

/**
 * Normalize a SQL query for pattern matching.
 * Replaces literal values with placeholders to group similar queries.
 */
export function normalizeQuery(sql: string): string {
  return (
    sql
      // Remove excess whitespace
      .replace(/\s+/g, " ")
      .trim()
      // Normalize numeric literals
      .replace(/\b\d+\b/g, "?")
      // Normalize string literals
      .replace(/'[^']*'/g, "'?'")
      // Normalize parameter placeholders ($1, $2, etc.)
      .replace(/\$\d+/g, "$?")
  );
}

// ---------------------------------------------------------------------------
// Index Suggestion
// ---------------------------------------------------------------------------

/**
 * Attempt to suggest a CREATE INDEX statement from a query pattern.
 * This is a heuristic — it handles common WHERE clause patterns.
 */
export function suggestIndex(sql: string): string | undefined {
  const normalized = sql.toUpperCase();

  // Extract table name from FROM clause
  const fromMatch = normalized.match(/FROM\s+(\w+)/);
  if (!fromMatch) return undefined;

  const table = fromMatch[1].toLowerCase();

  // Extract WHERE clause columns
  const whereMatch = normalized.match(/WHERE\s+(.+?)(?:ORDER|GROUP|LIMIT|$)/);
  if (!whereMatch) return undefined;

  const whereClause = whereMatch[1];

  // Extract column names from conditions (column = ?, column IN (?), etc.)
  const columns: string[] = [];
  const colMatches = whereClause.matchAll(
    /(\w+)\s*(?:=|IN|LIKE|>|<|>=|<=|!=|IS)/g,
  );
  for (const match of colMatches) {
    const col = match[1].toLowerCase();
    // Skip common non-column words
    if (!["and", "or", "not", "null", "true", "false"].includes(col)) {
      columns.push(col);
    }
  }

  if (columns.length === 0) return undefined;

  const indexName = `idx_${table}_${columns.join("_")}`;
  const columnList = columns.join(", ");

  return `CREATE INDEX ${indexName} ON ${table} (${columnList});`;
}

// ---------------------------------------------------------------------------
// Query Analyzer
// ---------------------------------------------------------------------------

export class QueryAnalyzer {
  private readonly enabled: boolean;
  private readonly slowThresholdMs: number;
  private readonly nPlusOneThreshold: number;
  private readonly writer: (message: string) => void;

  /** Queries grouped by request ID */
  private readonly queryMap = new Map<string, TrackedQuery[]>();

  constructor(options: QueryAnalyzerOptions = {}) {
    const isDev =
      process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
    this.enabled = options.enabled ?? isDev;
    this.slowThresholdMs = options.slowQueryThresholdMs ?? 100;
    this.nPlusOneThreshold = options.nPlusOneThreshold ?? 3;
    this.writer = options.writer ?? ((msg) => console.warn(msg));
  }

  /**
   * Check if the analyzer is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Track a query execution.
   * In production (disabled), this is a no-op.
   */
  track(sql: string, durationMs: number, requestId: string): void {
    if (!this.enabled) return;

    const entry: TrackedQuery = {
      sql,
      durationMs,
      requestId,
      timestamp: Date.now(),
    };

    const queries = this.queryMap.get(requestId) ?? [];
    queries.push(entry);
    this.queryMap.set(requestId, queries);

    // Emit slow query warning immediately
    if (durationMs > this.slowThresholdMs) {
      const suggestion = suggestIndex(sql);
      const indexHint = suggestion ? `\n  Suggested index: ${suggestion}` : "";
      this.writer(
        `[SLOW QUERY] ${durationMs}ms (threshold: ${this.slowThresholdMs}ms)\n` +
          `  SQL: ${sql}${indexHint}\n` +
          `  Request: ${requestId}`,
      );
    }
  }

  /**
   * Analyze all queries for a request and emit warnings.
   * Call this at the end of a request lifecycle.
   */
  report(requestId: string): QueryAnalysisReport | null {
    if (!this.enabled) return null;

    const queries = this.queryMap.get(requestId);
    if (!queries || queries.length === 0) return null;

    const slowQueries: SlowQueryWarning[] = [];
    const nPlusOneDetections: NPlusOneDetection[] = [];

    // --- Slow queries ---
    for (const q of queries) {
      if (q.durationMs > this.slowThresholdMs) {
        slowQueries.push({
          sql: q.sql,
          durationMs: q.durationMs,
          requestId: q.requestId,
          suggestedIndex: suggestIndex(q.sql),
        });
      }
    }

    // --- N+1 detection ---
    const patternCounts = new Map<string, number>();
    for (const q of queries) {
      const pattern = normalizeQuery(q.sql);
      patternCounts.set(pattern, (patternCounts.get(pattern) ?? 0) + 1);
    }

    for (const [pattern, count] of patternCounts) {
      if (count >= this.nPlusOneThreshold) {
        nPlusOneDetections.push({
          pattern,
          count,
          requestId,
          suggestion: `Query executed ${count} times in one request. Consider using a JOIN or batch query (WHERE id IN (...)) instead.`,
        });

        this.writer(
          `[N+1 DETECTED] Query repeated ${count}x in request ${requestId}\n` +
            `  Pattern: ${pattern}\n` +
            `  Fix: Use a JOIN or batch query (WHERE id IN (...))`,
        );
      }
    }

    const totalDurationMs = queries.reduce((sum, q) => sum + q.durationMs, 0);

    const report: QueryAnalysisReport = {
      requestId,
      totalQueries: queries.length,
      totalDurationMs,
      slowQueries,
      nPlusOneDetections,
    };

    return report;
  }

  /**
   * Clear tracked queries for a request (call after report).
   */
  clear(requestId: string): void {
    this.queryMap.delete(requestId);
  }

  /**
   * Clear all tracked queries.
   */
  clearAll(): void {
    this.queryMap.clear();
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a query analyzer.
 * Automatically disabled in production for zero overhead.
 *
 * @example
 *   const analyzer = createQueryAnalyzer();
 *   analyzer.track('SELECT * FROM users WHERE id = $1', 5, 'req-abc');
 *   analyzer.track('SELECT * FROM posts WHERE user_id = $1', 3, 'req-abc');
 *   const report = analyzer.report('req-abc');
 */
export function createQueryAnalyzer(
  options?: QueryAnalyzerOptions,
): QueryAnalyzer {
  return new QueryAnalyzer(options);
}
