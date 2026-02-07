/**
 * Error Handler Middleware
 *
 * Catches unhandled errors and returns structured, AI-friendly error responses.
 * Errors include codes, messages, and links to documentation.
 * Logs structured context (method, path, requestId) for observability.
 */

import type { MiddlewareHandler } from 'hono';
import { AppError } from '../../shared/errors/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StructuredErrorLog {
  level: string;
  timestamp: string;
  method: string;
  path: string;
  requestId: string;
  errorCode: string;
  errorMessage: string;
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Global error handling middleware for Hono.
 * Transforms AppError instances into structured JSON responses.
 * Logs unhandled errors with structured context for debugging.
 */
export function errorHandler(): MiddlewareHandler {
  return async (c, next) => {
    try {
      await next();
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(error.toJSON(), error.statusCode as 400);
      }

      // Extract request context for structured logging
      const method = c.req.method;
      const path = c.req.path;
      const requestId = c.req.header('x-request-id') ?? 'unknown';
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const logEntry: StructuredErrorLog = {
        level: 'error',
        timestamp: new Date().toISOString(),
        method,
        path,
        requestId,
        errorCode: 'E9999',
        errorMessage,
      };

      console.error(JSON.stringify(logEntry));

      return c.json(
        {
          code: 'E9999',
          message: 'Internal server error',
          docs: 'https://vibeonrails.dev/errors/E9999',
        },
        500,
      );
    }
  };
}
