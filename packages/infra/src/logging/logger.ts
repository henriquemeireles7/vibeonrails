/**
 * Structured Logger
 *
 * Provides structured JSON logging for production and pretty-printed
 * logs for development. Every log entry includes: request_id, timestamp,
 * level, module, message, and context. Logs to stdout (12-factor).
 *
 * Usage:
 *   import { createLogger, logger } from '@vibeonrails/infra/logging';
 *
 *   // Default logger
 *   logger.info('Server started', { port: 3000 });
 *
 *   // Module-scoped logger
 *   const log = createLogger({ module: 'api' });
 *   log.info('Listening', { port: 3000 });
 *
 *   // Request-scoped child logger
 *   const reqLog = log.child({ requestId: 'abc-123' });
 *   reqLog.info('Handling request');
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Structured log entry written to stdout.
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  module?: string;
  requestId?: string;
  [key: string]: unknown;
}

/**
 * Options for creating a logger.
 */
export interface LoggerOptions {
  /** Module name to include in every log entry */
  module?: string;
  /** Minimum log level (default: from LOG_LEVEL env or 'info') */
  minLevel?: LogLevel;
  /** Static context merged into every log entry */
  context?: Record<string, unknown>;
  /** Custom writer for testing (default: console.log) */
  writer?: (line: string) => void;
}

// ---------------------------------------------------------------------------
// Dev Formatting (pino-pretty inspired)
// ---------------------------------------------------------------------------

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // cyan
  info: '\x1b[32m',  // green
  warn: '\x1b[33m',  // yellow
  error: '\x1b[31m', // red
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';

function formatDev(entry: LogEntry): string {
  const color = COLORS[entry.level];
  const time = entry.timestamp.slice(11, 23); // HH:mm:ss.SSS
  const mod = entry.module ? `${DIM}(${entry.module})${RESET} ` : '';
  const reqId = entry.requestId ? `${DIM}[${entry.requestId.slice(0, 8)}]${RESET} ` : '';
  const levelTag = `${color}${BOLD}${entry.level.toUpperCase().padEnd(5)}${RESET}`;

  // Extract extra data (exclude known fields)
  const known = new Set(['level', 'message', 'timestamp', 'module', 'requestId']);
  const extra: Record<string, unknown> = {};
  let hasExtra = false;

  for (const [key, value] of Object.entries(entry)) {
    if (!known.has(key)) {
      extra[key] = value;
      hasExtra = true;
    }
  }

  const extraStr = hasExtra ? ` ${DIM}${JSON.stringify(extra)}${RESET}` : '';

  return `${DIM}${time}${RESET} ${levelTag} ${mod}${reqId}${entry.message}${extraStr}`;
}

function formatJson(entry: LogEntry): string {
  return JSON.stringify(entry);
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

export class Logger {
  private readonly moduleName: string | undefined;
  private readonly context: Record<string, unknown>;
  private readonly minLevel: LogLevel;
  private readonly write: (line: string) => void;

  constructor(options: LoggerOptions = {}) {
    this.moduleName = options.module;
    this.context = options.context ?? {};
    this.minLevel = options.minLevel ?? (process.env.LOG_LEVEL as LogLevel) ?? 'info';
    this.write = options.writer ?? ((line: string) => console.log(line));
  }

  /**
   * Create a child logger that inherits this logger's context and module.
   * Commonly used for request-scoped logging.
   */
  child(ctx: Record<string, unknown>): Logger {
    return new Logger({
      module: (ctx.module as string) ?? this.moduleName,
      minLevel: this.minLevel,
      context: { ...this.context, ...ctx },
      writer: this.write,
    });
  }

  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, error?: Error | Record<string, unknown>): void {
    const data = error instanceof Error
      ? { error: { message: error.message, stack: error.stack, name: error.name } }
      : error;
    this.log('error', message, data);
  }

  /**
   * Check if a given log level would produce output.
   * Useful for avoiding expensive string building for debug messages.
   */
  isLevelEnabled(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  /**
   * Get current module name.
   */
  getModule(): string | undefined {
    return this.moduleName;
  }

  /**
   * Get current context.
   */
  getContext(): Record<string, unknown> {
    return { ...this.context };
  }

  // -----------------------------------------------------------------------
  // Internal
  // -----------------------------------------------------------------------

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };

    if (this.moduleName) {
      entry.module = this.moduleName;
    }

    // Merge context — requestId gets promoted to top-level
    const merged = { ...this.context, ...data };

    if (merged.requestId) {
      entry.requestId = merged.requestId as string;
      delete merged.requestId;
    }

    if (merged.module) {
      // Don't duplicate module in extra data
      delete merged.module;
    }

    // Spread remaining context
    Object.assign(entry, merged);

    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    const formatted = isDev ? formatDev(entry) : formatJson(entry);

    this.write(formatted);
  }
}

// ---------------------------------------------------------------------------
// Factory & Default Instance
// ---------------------------------------------------------------------------

/**
 * Create a new logger with the given options.
 *
 * @example
 *   const log = createLogger({ module: 'api' });
 *   log.info('Server started', { port: 3000 });
 */
export function createLogger(options?: LoggerOptions): Logger {
  return new Logger(options);
}

/**
 * Default logger instance. Use `createLogger()` for module-scoped loggers.
 */
export const logger = new Logger();
