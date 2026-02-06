/**
 * API Key Middleware
 *
 * Hono middleware to authenticate requests by API key.
 * Extracts key from Authorization header or X-API-Key header,
 * validates it, and attaches the key record to the context.
 */

import type { Context, Next, MiddlewareHandler } from 'hono';
import type { APIKeyService, APIKey } from './types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface APIKeyMiddlewareOptions {
  /** The API key service for validation */
  service: APIKeyService;

  /** Header to extract the key from (default: both Authorization and X-API-Key) */
  headerName?: string;

  /** Whether to track usage on each request (default: true) */
  trackUsage?: boolean;

  /** Required scopes for this endpoint (empty = any valid key) */
  requiredScopes?: string[];

  /** Custom error response */
  onError?: (
    c: Context,
    error: 'missing' | 'invalid' | 'expired' | 'revoked' | 'rate_limited' | 'insufficient_scope',
  ) => Response;
}

// ---------------------------------------------------------------------------
// Key Extraction
// ---------------------------------------------------------------------------

function extractAPIKey(
  c: Context,
  headerName?: string,
): string | null {
  if (headerName) {
    return c.req.header(headerName) ?? null;
  }

  // Check Authorization header first (Bearer scheme)
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) {
    const token = auth.substring(7);
    if (token.startsWith('vor_')) {
      return token;
    }
  }

  // Check X-API-Key header
  const apiKey = c.req.header('X-API-Key');
  if (apiKey) {
    return apiKey;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Middleware Factory
// ---------------------------------------------------------------------------

/**
 * Create API key authentication middleware.
 *
 * @example
 * ```ts
 * const apiKeyAuth = createAPIKeyMiddleware({ service: apiKeyService });
 *
 * app.use('/api/*', apiKeyAuth);
 * ```
 */
export function createAPIKeyMiddleware(
  options: APIKeyMiddlewareOptions,
): MiddlewareHandler {
  const {
    service,
    headerName,
    trackUsage = true,
    requiredScopes = [],
    onError,
  } = options;

  return async (c: Context, next: Next) => {
    const key = extractAPIKey(c, headerName);

    if (!key) {
      if (onError) {
        return onError(c, 'missing');
      }
      return c.json(
        { error: 'API key required', code: 'API_KEY_MISSING' },
        401,
      );
    }

    const result = await service.validate(key);

    if (!result.valid) {
      const errorType = result.error ?? 'invalid';
      if (onError) {
        return onError(c, errorType);
      }

      const statusMap: Record<string, number> = {
        invalid: 401,
        expired: 401,
        revoked: 401,
        rate_limited: 429,
      };

      return c.json(
        { error: `API key ${errorType}`, code: `API_KEY_${errorType.toUpperCase()}` },
        (statusMap[errorType] ?? 401) as 401 | 429,
      );
    }

    // Check required scopes
    if (requiredScopes.length > 0) {
      const keyScopes = result.apiKey!.scopes;
      const hasAllScopes = requiredScopes.every((s) =>
        keyScopes.includes(s),
      );
      if (!hasAllScopes) {
        if (onError) {
          return onError(c, 'insufficient_scope');
        }
        return c.json(
          {
            error: 'Insufficient API key scope',
            code: 'API_KEY_INSUFFICIENT_SCOPE',
            required: requiredScopes,
          },
          403,
        );
      }
    }

    // Track usage
    if (trackUsage) {
      // Fire and forget — don't slow down the request
      service.trackUsage(result.apiKey!.id).catch(() => {
        // Silently ignore tracking errors
      });
    }

    // Attach API key to context
    c.set('apiKey', result.apiKey as APIKey);
    c.set('apiKeyId', result.apiKey!.id);
    c.set('apiKeyOwnerId', result.apiKey!.ownerId);

    await next();
  };
}
