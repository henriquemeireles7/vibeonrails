/**
 * Middleware barrel export
 */

export { errorHandler } from "./error-handler.js";
export { rateLimit } from "./rate-limit.js";
export {
  timingMiddleware,
  addTimingPhase,
  colorizeDuration,
  formatTimingLog,
  isProduction,
  TIMING_THRESHOLDS,
} from "./timing.js";
export type { TimingPhase } from "./timing.js";
export {
  tracing,
  getRequestId,
  getTraceContext,
  getRequestDuration,
  propagationHeaders,
  generateRequestId,
  REQUEST_ID_HEADER,
  type TraceContext,
  type TracingOptions,
} from "./tracing.js";
