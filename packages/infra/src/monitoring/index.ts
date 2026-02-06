export {
  increment,
  gauge,
  observe,
  getCounter,
  getGauge,
  getHistogram,
  getAllMetrics,
  clearMetrics,
} from "./metrics.js";
export type { MetricValue } from "./metrics.js";

export {
  generateTraceId,
  generateSpanId,
  startSpan,
  endSpan,
  setSpanAttributes,
  getActiveSpan,
  clearSpans,
} from "./tracing.js";
export type { SpanContext } from "./tracing.js";
