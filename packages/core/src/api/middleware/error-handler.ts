/**
 * Error Handler Middleware
 *
 * Catches unhandled errors and returns structured, AI-friendly error responses.
 * Errors include codes, messages, and links to documentation.
 */

import type { MiddlewareHandler } from 'hono';
import { AppError } from '../../shared/errors/index.js';

/**
 * Global error handling middleware for Hono.
 * Transforms AppError instances into structured JSON responses.
 */
export function errorHandler(): MiddlewareHandler {
  return async (c, next) => {
    try {
      await next();
    } catch (error) {
      if (error instanceof AppError) {
        return c.json(error.toJSON(), error.statusCode as 400);
      }

      // Unknown error — log and return generic 500
      console.error('[AOR] Unhandled error:', error);

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
