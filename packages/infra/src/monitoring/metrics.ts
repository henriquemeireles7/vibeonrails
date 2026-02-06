/**
 * Metrics Collection — Counter, Histogram, Gauge
 */

export interface MetricValue {
  name: string;
  type: "counter" | "histogram" | "gauge";
  value: number;
  labels?: Record<string, string>;
  timestamp: number;
}

const counters = new Map<string, number>();
const gauges = new Map<string, number>();
const histograms = new Map<string, number[]>();

function labelKey(name: string, labels?: Record<string, string>): string {
  if (!labels || Object.keys(labels).length === 0) return name;
  const sorted = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  return `${name}{${sorted.map(([k, v]) => `${k}="${v}"`).join(",")}}`;
}

/** Increment a counter. */
export function increment(name: string, value = 1, labels?: Record<string, string>): void {
  const key = labelKey(name, labels);
  counters.set(key, (counters.get(key) ?? 0) + value);
}

/** Set a gauge value. */
export function gauge(name: string, value: number, labels?: Record<string, string>): void {
  const key = labelKey(name, labels);
  gauges.set(key, value);
}

/** Observe a histogram value. */
export function observe(name: string, value: number, labels?: Record<string, string>): void {
  const key = labelKey(name, labels);
  const arr = histograms.get(key) ?? [];
  arr.push(value);
  histograms.set(key, arr);
}

/** Get a counter value. */
export function getCounter(name: string, labels?: Record<string, string>): number {
  return counters.get(labelKey(name, labels)) ?? 0;
}

/** Get a gauge value. */
export function getGauge(name: string, labels?: Record<string, string>): number {
  return gauges.get(labelKey(name, labels)) ?? 0;
}

/** Get histogram observations. */
export function getHistogram(name: string, labels?: Record<string, string>): number[] {
  return histograms.get(labelKey(name, labels)) ?? [];
}

/** Get all metrics as a snapshot. */
export function getAllMetrics(): MetricValue[] {
  const now = Date.now();
  const result: MetricValue[] = [];

  for (const [name, value] of counters) {
    result.push({ name, type: "counter", value, timestamp: now });
  }
  for (const [name, value] of gauges) {
    result.push({ name, type: "gauge", value, timestamp: now });
  }
  for (const [name, values] of histograms) {
    const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    result.push({ name, type: "histogram", value: avg, timestamp: now });
  }

  return result;
}

/** Clear all metrics (for testing). */
export function clearMetrics(): void {
  counters.clear();
  gauges.clear();
  histograms.clear();
}
