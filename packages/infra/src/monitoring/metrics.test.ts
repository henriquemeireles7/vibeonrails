import { describe, it, expect, beforeEach } from "vitest";
import {
  increment, gauge, observe,
  getCounter, getGauge, getHistogram,
  getAllMetrics, clearMetrics,
} from "./metrics.js";
import {
  startSpan, endSpan, setSpanAttributes, getActiveSpan, clearSpans,
} from "./tracing.js";

describe("Metrics", () => {
  beforeEach(() => { clearMetrics(); });

  it("increments a counter", () => {
    increment("requests");
    increment("requests");
    expect(getCounter("requests")).toBe(2);
  });

  it("increments with labels", () => {
    increment("requests", 1, { method: "GET" });
    increment("requests", 1, { method: "POST" });
    increment("requests", 1, { method: "GET" });
    expect(getCounter("requests", { method: "GET" })).toBe(2);
    expect(getCounter("requests", { method: "POST" })).toBe(1);
  });

  it("sets a gauge", () => {
    gauge("active_connections", 42);
    expect(getGauge("active_connections")).toBe(42);
    gauge("active_connections", 10);
    expect(getGauge("active_connections")).toBe(10);
  });

  it("observes histogram values", () => {
    observe("response_time", 100);
    observe("response_time", 200);
    observe("response_time", 300);
    expect(getHistogram("response_time")).toEqual([100, 200, 300]);
  });

  it("gets all metrics", () => {
    increment("req");
    gauge("conn", 5);
    observe("latency", 50);
    const all = getAllMetrics();
    expect(all).toHaveLength(3);
  });
});

describe("Tracing", () => {
  beforeEach(() => { clearSpans(); });

  it("starts and ends a span", () => {
    const span = startSpan("test-op");
    expect(span.traceId).toHaveLength(32);
    expect(span.spanId).toHaveLength(16);
    expect(span.name).toBe("test-op");
    expect(span.endTime).toBeUndefined();

    const ended = endSpan(span.spanId);
    expect(ended).toBeDefined();
    expect(ended!.endTime).toBeGreaterThan(0);
  });

  it("sets span attributes", () => {
    const span = startSpan("http-request");
    setSpanAttributes(span.spanId, { method: "GET", status: 200 });

    const active = getActiveSpan(span.spanId);
    expect(active!.attributes).toMatchObject({ method: "GET", status: 200 });
  });

  it("returns undefined for unknown spans", () => {
    expect(endSpan("nonexistent")).toBeUndefined();
  });
});
