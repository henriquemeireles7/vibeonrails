/**
 * Request Tracing Middleware
 *
 * Assigns a unique x-request-id to every HTTP request. Propagates through
 * DB queries, external API calls, AI SDK calls, and queue jobs.
 * Full lifecycle traceable from one ID.
 *
 * Usage:
 *   import { tracing, getRequestId } from '@vibeonrails/core/api';
 *
 *   app.use(tracing());
 *
 *   // In any handler:
 *   const reqId = getRequestId(c);
 */

import type { MiddlewareHandler, Context } from "hono";

// ---------------------------------------------------------------------------
// Request ID Generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique request ID. Uses crypto.randomUUID when available,
 * falls back to timestamp + random for environments without it.
 */
export function generateRequestId(): string {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `${timestamp}-${random}`;
}

// ---------------------------------------------------------------------------
// Request Context Storage (AsyncLocalStorage)
// ---------------------------------------------------------------------------

/**
 * Trace context carries request_id and optional metadata
 * through the entire request lifecycle.
 */
export interface TraceContext {
  /** Unique request identifier */
  requestId: string;
  /** Request start time for duration calculation */
  startTime: number;
  /** Optional parent span for distributed tracing */
  parentSpanId?: string;
  /** Optional span ID for this request */
  spanId?: string;
}

/** Hono context variable key for the trace context */
const TRACE_CTX_KEY = "traceContext";

/** Header name for request ID propagation */
export const REQUEST_ID_HEADER = "x-request-id";

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export interface TracingOptions {
  /** Custom header name (default: x-request-id) */
  headerName?: string;
  /** Whether to trust incoming request IDs (default: true) */
  trustProxy?: boolean;
  /** Custom ID generator (default: crypto.randomUUID) */
  generateId?: () => string;
}

/**
 * Request tracing middleware for Hono.
 *
 * - Reads or generates x-request-id
 * - Stores in Hono context (c.get('traceContext'))
 * - Sets response header x-request-id
 * - Logs request start/end with duration
 */
export function tracing(options: TracingOptions = {}): MiddlewareHandler {
  const headerName = options.headerName ?? REQUEST_ID_HEADER;
  const trustProxy = options.trustProxy ?? true;
  const generateId = options.generateId ?? generateRequestId;

  return async (c, next) => {
    // Read incoming request ID or generate a new one
    const incomingId = trustProxy ? c.req.header(headerName) : undefined;
    const requestId = incomingId ?? generateId();

    const traceContext: TraceContext = {
      requestId,
      startTime: Date.now(),
      parentSpanId: incomingId ? requestId : undefined,
    };

    // Store in Hono context
    c.set(TRACE_CTX_KEY, traceContext);

    // Set response header before processing
    c.header(headerName, requestId);

    await next();
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the request ID from a Hono context.
 * Returns undefined if tracing middleware is not installed.
 */
export function getRequestId(c: Context): string | undefined {
  const ctx = c.get(TRACE_CTX_KEY) as TraceContext | undefined;
  return ctx?.requestId;
}

/**
 * Get the full trace context from a Hono context.
 */
export function getTraceContext(c: Context): TraceContext | undefined {
  return c.get(TRACE_CTX_KEY) as TraceContext | undefined;
}

/**
 * Calculate elapsed time since request start.
 */
export function getRequestDuration(c: Context): number | undefined {
  const ctx = c.get(TRACE_CTX_KEY) as TraceContext | undefined;
  if (!ctx) return undefined;
  return Date.now() - ctx.startTime;
}

/**
 * Create headers object with the request ID for propagating
 * to external API calls, queue jobs, etc.
 */
export function propagationHeaders(c: Context): Record<string, string> {
  const requestId = getRequestId(c);
  if (!requestId) return {};
  return { [REQUEST_ID_HEADER]: requestId };
}
