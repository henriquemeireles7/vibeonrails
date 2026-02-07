/**
 * Body Limit Middleware
 *
 * Rejects requests whose Content-Length exceeds a configurable maximum.
 * Returns 413 Payload Too Large with a structured error response.
 */

import type { MiddlewareHandler } from 'hono';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BodyLimitOptions {
  /** Maximum allowed body size in bytes (default: 1 MB). */
  maxSize?: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default maximum body size: 1 MB */
const DEFAULT_MAX_SIZE = 1_048_576;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Create a body-limit middleware that rejects oversized requests.
 *
 * Checks the Content-Length header and returns a 413 response
 * if the declared size exceeds `maxSize`.
 *
 * @param options - Optional configuration
 * @returns Hono middleware handler
 */
export function bodyLimit(options: BodyLimitOptions = {}): MiddlewareHandler {
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;

  return async (c, next) => {
    const contentLength = c.req.header('content-length');

    if (contentLength) {
      const size = parseInt(contentLength, 10);

      if (!Number.isNaN(size) && size > maxSize) {
        return c.json(
          {
            code: 'E4013',
            message: `Payload too large. Maximum allowed size is ${maxSize} bytes.`,
            docs: 'https://vibeonrails.dev/errors/E4013',
          },
          413,
        );
      }
    }

    await next();
  };
}
