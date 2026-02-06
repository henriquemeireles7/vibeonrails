/**
 * Structured Logger
 *
 * Provides structured JSON logging for production and pretty-printed
 * logs for development. Supports child loggers with inherited context.
 *
 * Usage:
 *   import { logger } from '@vibeonrails/infra/logging';
 *
 *   logger.info('Server started', { port: 3000 });
 *   const childLog = logger.child({ requestId: '123' });
 *   childLog.info('Handling request');
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

export class Logger {
  private context: Record<string, unknown>;
  private minLevel: LogLevel;

  constructor(
    context: Record<string, unknown> = {},
    minLevel?: LogLevel,
  ) {
    this.context = context;
    this.minLevel = minLevel ?? (process.env.LOG_LEVEL as LogLevel) ?? 'info';
  }

  /**
   * Create a child logger that inherits this logger's context.
   */
  child(ctx: Record<string, unknown>): Logger {
    return new Logger({ ...this.context, ...ctx }, this.minLevel);
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

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    if (LOG_LEVELS[level] < LOG_LEVELS[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...data,
    };

    const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';

    if (isDev) {
      const color = { debug: '\x1b[36m', info: '\x1b[32m', warn: '\x1b[33m', error: '\x1b[31m' }[level];
      const reset = '\x1b[0m';
      const extra = data ? ` ${JSON.stringify(data)}` : '';
      console.log(`${color}[${level.toUpperCase()}]${reset} ${message}${extra}`);
    } else {
      console.log(JSON.stringify(entry));
    }
  }
}

/**
 * Default logger instance.
 */
export const logger = new Logger();
