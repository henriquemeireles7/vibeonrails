/**
 * Production Error Reporter
 *
 * Captures and reports errors with full context:
 * - Error code (from catalog)
 * - request_id
 * - user_id
 * - Stack trace
 * - auto_fixable hint
 *
 * Errors are batched in memory and queryable by time range.
 * `vibe errors --last 24h` queries the production error log.
 *
 * Usage:
 *   import { createErrorReporter } from '@vibeonrails/core/errors';
 *
 *   const reporter = createErrorReporter();
 *   reporter.capture(error, { requestId: 'req-123', userId: 'u1' });
 *   const recent = reporter.query({ lastHours: 24 });
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Context attached to a captured error.
 */
export interface ErrorContext {
  /** Request ID for tracing */
  requestId?: string;
  /** User who experienced the error */
  userId?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * A stored error report entry.
 */
export interface ErrorReport {
  /** Unique report ID */
  id: string;
  /** Timestamp of the error */
  timestamp: string;
  /** Error code from catalog (if CatalogError) */
  code: string | null;
  /** Error message */
  message: string;
  /** Stack trace */
  stack: string | null;
  /** HTTP status code */
  statusCode: number;
  /** Whether the error is auto-fixable */
  autoFixable: boolean;
  /** Fix suggestion */
  fix: string | null;
  /** Request ID */
  requestId: string | null;
  /** User ID */
  userId: string | null;
  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Query options for error reports.
 */
export interface ErrorQueryOptions {
  /** Return errors from the last N hours */
  lastHours?: number;
  /** Filter by error code */
  code?: string;
  /** Filter by request ID */
  requestId?: string;
  /** Maximum number of results */
  limit?: number;
}

/**
 * Options for creating an error reporter.
 */
export interface ErrorReporterOptions {
  /** Maximum number of errors to keep in memory (default: 1000) */
  maxEntries?: number;
  /** Custom writer for error reports */
  writer?: (report: ErrorReport) => void;
}

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

function generateReportId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `err-${timestamp}-${random}`;
}

// ---------------------------------------------------------------------------
// Error Reporter
// ---------------------------------------------------------------------------

export class ErrorReporter {
  private readonly entries: ErrorReport[] = [];
  private readonly maxEntries: number;
  private readonly writer: ((report: ErrorReport) => void) | undefined;

  constructor(options: ErrorReporterOptions = {}) {
    this.maxEntries = options.maxEntries ?? 1000;
    this.writer = options.writer;
  }

  /**
   * Capture an error with context.
   * Normalizes various error types into a structured ErrorReport.
   */
  capture(error: unknown, context: ErrorContext = {}): ErrorReport {
    const report = this.normalizeError(error, context);

    // Add to buffer (circular — evict oldest when full)
    this.entries.push(report);
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }

    // Emit via writer if configured
    if (this.writer) {
      this.writer(report);
    }

    return report;
  }

  /**
   * Query stored error reports.
   */
  query(options: ErrorQueryOptions = {}): ErrorReport[] {
    let results = [...this.entries];

    // Time filter
    if (options.lastHours !== undefined) {
      const cutoff = new Date(Date.now() - options.lastHours * 60 * 60 * 1000);
      results = results.filter((r) => new Date(r.timestamp) >= cutoff);
    }

    // Code filter
    if (options.code) {
      results = results.filter((r) => r.code === options.code);
    }

    // Request ID filter
    if (options.requestId) {
      results = results.filter((r) => r.requestId === options.requestId);
    }

    // Newest first
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Limit
    if (options.limit !== undefined) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get summary statistics.
   */
  getSummary(lastHours?: number): {
    total: number;
    byCode: Record<string, number>;
    autoFixable: number;
  } {
    const reports = lastHours !== undefined
      ? this.query({ lastHours })
      : [...this.entries];

    const byCode: Record<string, number> = {};
    let autoFixable = 0;

    for (const r of reports) {
      const key = r.code ?? 'UNKNOWN';
      byCode[key] = (byCode[key] ?? 0) + 1;
      if (r.autoFixable) autoFixable++;
    }

    return { total: reports.length, byCode, autoFixable };
  }

  /**
   * Get all stored entries count.
   */
  get size(): number {
    return this.entries.length;
  }

  /**
   * Clear all stored entries.
   */
  clear(): void {
    this.entries.length = 0;
  }

  /**
   * Export all entries as JSON (for CLI `vibe errors` command).
   */
  toJSON(): ErrorReport[] {
    return [...this.entries];
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private normalizeError(error: unknown, context: ErrorContext): ErrorReport {
    // Handle CatalogError (duck-type check to avoid import dependency)
    if (this.isCatalogError(error)) {
      return {
        id: generateReportId(),
        timestamp: new Date().toISOString(),
        code: error.code,
        message: error.message,
        stack: error.stack ?? null,
        statusCode: error.statusCode ?? 500,
        autoFixable: error.autoFixable ?? false,
        fix: error.fix ?? null,
        requestId: context.requestId ?? null,
        userId: context.userId ?? null,
        metadata: context.metadata ?? {},
      };
    }

    // Handle standard Error
    if (error instanceof Error) {
      return {
        id: generateReportId(),
        timestamp: new Date().toISOString(),
        code: null,
        message: error.message,
        stack: error.stack ?? null,
        statusCode: 500,
        autoFixable: false,
        fix: null,
        requestId: context.requestId ?? null,
        userId: context.userId ?? null,
        metadata: context.metadata ?? {},
      };
    }

    // Handle unknown error shapes
    return {
      id: generateReportId(),
      timestamp: new Date().toISOString(),
      code: null,
      message: String(error),
      stack: null,
      statusCode: 500,
      autoFixable: false,
      fix: null,
      requestId: context.requestId ?? null,
      userId: context.userId ?? null,
      metadata: context.metadata ?? {},
    };
  }

  private isCatalogError(error: unknown): error is {
    code: string;
    message: string;
    stack?: string;
    statusCode: number;
    autoFixable: boolean;
    fix: string;
  } {
    return (
      error !== null &&
      typeof error === 'object' &&
      'code' in error &&
      'statusCode' in error &&
      'autoFixable' in error &&
      error instanceof Error
    );
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create an error reporter.
 *
 * @example
 *   const reporter = createErrorReporter();
 *   reporter.capture(new Error('Something broke'), { requestId: 'req-123' });
 *   const recent = reporter.query({ lastHours: 24 });
 */
export function createErrorReporter(options?: ErrorReporterOptions): ErrorReporter {
  return new ErrorReporter(options);
}
