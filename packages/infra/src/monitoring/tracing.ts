/**
 * Request Tracing — Trace ID propagation for distributed tracing.
 */

/**
 * Generate a unique trace ID.
 */
export function generateTraceId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a span ID.
 */
export function generateSpanId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface SpanContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: number;
  endTime?: number;
  attributes?: Record<string, string | number | boolean>;
}

const activeSpans = new Map<string, SpanContext>();

/**
 * Start a new span.
 */
export function startSpan(name: string, parentSpanId?: string): SpanContext {
  const span: SpanContext = {
    traceId: generateTraceId(),
    spanId: generateSpanId(),
    parentSpanId,
    name,
    startTime: Date.now(),
  };
  activeSpans.set(span.spanId, span);
  return span;
}

/**
 * End a span and record its duration.
 */
export function endSpan(spanId: string): SpanContext | undefined {
  const span = activeSpans.get(spanId);
  if (span) {
    span.endTime = Date.now();
    activeSpans.delete(spanId);
  }
  return span;
}

/**
 * Add attributes to a span.
 */
export function setSpanAttributes(spanId: string, attributes: Record<string, string | number | boolean>): void {
  const span = activeSpans.get(spanId);
  if (span) {
    span.attributes = { ...span.attributes, ...attributes };
  }
}

/**
 * Get an active span.
 */
export function getActiveSpan(spanId: string): SpanContext | undefined {
  return activeSpans.get(spanId);
}

/**
 * Clear all active spans (for testing).
 */
export function clearSpans(): void {
  activeSpans.clear();
}
