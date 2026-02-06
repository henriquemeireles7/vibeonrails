/**
 * AppError — Catalog-Based Error Class
 *
 * Constructor takes error code + context params.
 * Outputs human-readable (default) or structured JSON (VIBE_OUTPUT=json).
 */

import {
  type ErrorCatalogEntry,
  getError,
  interpolateMessage,
} from './catalog.js';

// ---------------------------------------------------------------------------
// Output Mode Detection
// ---------------------------------------------------------------------------

type OutputMode = 'human' | 'json' | 'ci';

function getOutputMode(): OutputMode {
  const mode = process.env.VIBE_OUTPUT;
  if (mode === 'json') return 'json';
  if (mode === 'ci') return 'ci';
  return 'human';
}

// ---------------------------------------------------------------------------
// CatalogError
// ---------------------------------------------------------------------------

/**
 * Error class that uses the error catalog for structured errors.
 * Every framework error should use this class instead of raw Error.
 */
export class CatalogError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly detail: string;
  public readonly fix: string;
  public readonly autoFixable: boolean;
  public readonly docsUrl: string;
  public readonly params: Record<string, string>;

  constructor(
    code: string,
    params: Record<string, string> = {},
    options?: { cause?: unknown },
  ) {
    const entry = getError(code);
    if (!entry) {
      super(`Unknown error code: ${code}`);
      this.code = code;
      this.statusCode = 500;
      this.detail = '';
      this.fix = '';
      this.autoFixable = false;
      this.docsUrl = '';
      this.params = params;
      this.name = 'CatalogError';
      return;
    }

    const message = interpolateMessage(entry.message, params);
    super(message, { cause: options?.cause });

    this.name = 'CatalogError';
    this.code = entry.code;
    this.statusCode = entry.statusCode;
    this.detail = interpolateMessage(entry.detail, params);
    this.fix = interpolateMessage(entry.fix, params);
    this.autoFixable = entry.autoFixable;
    this.docsUrl = entry.docsUrl;
    this.params = params;
  }

  /**
   * Convert to JSON output format.
   * Used when VIBE_OUTPUT=json or for API error responses.
   */
  toJSON(): Record<string, unknown> {
    return {
      error: {
        code: this.code,
        message: this.message,
        detail: this.detail,
        statusCode: this.statusCode,
        fix: this.fix,
        autoFixable: this.autoFixable,
        docsUrl: this.docsUrl,
        params: this.params,
      },
    };
  }

  /**
   * Format the error for display based on VIBE_OUTPUT mode.
   */
  format(): string {
    const mode = getOutputMode();

    if (mode === 'json') {
      return JSON.stringify(this.toJSON(), null, 2);
    }

    if (mode === 'ci') {
      return `[${this.code}] ${this.message}\n  Fix: ${this.fix}\n  Docs: ${this.docsUrl}`;
    }

    // Human mode (with colors when supported)
    const lines = [
      `Error [${this.code}]: ${this.message}`,
      '',
      `  ${this.detail}`,
      '',
      `  Fix: ${this.fix}`,
    ];

    if (this.autoFixable) {
      lines.push('  (auto-fixable: yes)');
    }

    lines.push(`  Docs: ${this.docsUrl}`);

    return lines.join('\n');
  }
}
