/**
 * Dev Request Timing Middleware
 *
 * Dev-only middleware that reports per-request timing breakdown:
 * [200 OK] POST /trpc/order.create 23ms (auth: 1ms, validate: 2ms, db: 18ms, serialize: 2ms)
 *
 * Highlights slow components:
 * - Yellow: >50ms
 * - Red: >100ms
 *
 * Disabled in production (NODE_ENV === 'production').
 */

import type { MiddlewareHandler, Context } from "hono";

/**
 * Timing phases tracked during request processing.
 */
export interface TimingPhase {
  readonly name: string;
  readonly durationMs: number;
}

/**
 * Timing thresholds for coloring output.
 */
export const TIMING_THRESHOLDS = {
  warn: 50,
  error: 100,
} as const;

/**
 * Check if we are in production mode.
 */
export function isProduction(): boolean {
  return process.env["NODE_ENV"] === "production";
}

/**
 * Colorize a duration based on thresholds.
 * Returns the duration with ANSI color codes.
 */
export function colorizeDuration(ms: number): string {
  if (ms >= TIMING_THRESHOLDS.error) {
    return `\x1b[31m${ms}ms\x1b[0m`; // Red
  }
  if (ms >= TIMING_THRESHOLDS.warn) {
    return `\x1b[33m${ms}ms\x1b[0m`; // Yellow
  }
  return `${ms}ms`;
}

/**
 * Format the timing breakdown for console output.
 */
export function formatTimingLog(
  status: number,
  method: string,
  path: string,
  totalMs: number,
  phases: readonly TimingPhase[],
): string {
  const statusText = `[${status} ${getStatusText(status)}]`;
  const coloredTotal = colorizeDuration(totalMs);

  let phasesText = "";
  if (phases.length > 0) {
    const phaseStrs = phases.map(
      (p) => `${p.name}: ${colorizeDuration(p.durationMs)}`,
    );
    phasesText = ` (${phaseStrs.join(", ")})`;
  }

  return `${statusText} ${method} ${path} ${coloredTotal}${phasesText}`;
}

/**
 * Get HTTP status text.
 */
function getStatusText(status: number): string {
  const texts: Record<number, string> = {
    200: "OK",
    201: "Created",
    204: "No Content",
    301: "Moved",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    409: "Conflict",
    422: "Unprocessable",
    429: "Too Many Requests",
    500: "Server Error",
  };
  return texts[status] ?? String(status);
}

/**
 * Create the timing context key for storing phases.
 */
const TIMING_KEY = "x-timing-phases";

/**
 * Add a timing phase from within a handler or middleware.
 * Call this from other middleware to contribute to the timing breakdown.
 */
export function addTimingPhase(
  c: Context,
  name: string,
  durationMs: number,
): void {
  const phases: TimingPhase[] = c.get(TIMING_KEY) ?? [];
  phases.push({ name, durationMs });
  c.set(TIMING_KEY, phases);
}

/**
 * Dev-only request timing middleware.
 * Disabled in production for zero overhead.
 */
export function timingMiddleware(): MiddlewareHandler {
  return async (c, next) => {
    // Skip in production
    if (isProduction()) {
      await next();
      return;
    }

    const start = performance.now();

    // Initialize timing phases
    c.set(TIMING_KEY, []);

    await next();

    const totalMs = Math.round(performance.now() - start);
    const phases: TimingPhase[] = c.get(TIMING_KEY) ?? [];

    const log = formatTimingLog(
      c.res.status,
      c.req.method,
      c.req.path,
      totalMs,
      phases,
    );

    console.log(log);
  };
}
