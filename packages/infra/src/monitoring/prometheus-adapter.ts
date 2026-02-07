/**
 * Prometheus Metrics Adapter — Formats metrics in Prometheus text exposition format.
 *
 * Converts the internal MetricValue snapshots into the standard Prometheus
 * text-based exposition format for scraping.
 *
 * Output example:
 *   # TYPE http_requests_total counter
 *   http_requests_total{method="GET",path="/api"} 42
 *
 * Usage:
 *   import { getAllMetrics } from './metrics.js';
 *   import { formatPrometheusMetrics, createPrometheusExporter } from './prometheus-adapter.js';
 *
 *   const text = formatPrometheusMetrics(getAllMetrics());
 *   // or
 *   const exporter = createPrometheusExporter(getAllMetrics);
 *   const text = exporter.export();
 */

import type { MetricValue } from "./metrics.js";

/** Labels key-value pair parsed from a metric name with embedded labels. */
interface ParsedMetric {
  name: string;
  labels: string;
}

/**
 * Parse a metric key that may contain embedded labels.
 * Format: `name{key="val",key2="val2"}` or just `name`
 *
 * @param raw - Raw metric key string
 * @returns Parsed name and label string
 */
function parseMetricKey(raw: string): ParsedMetric {
  const braceIdx = raw.indexOf("{");
  if (braceIdx === -1) {
    return { name: raw, labels: "" };
  }
  return {
    name: raw.substring(0, braceIdx),
    labels: raw.substring(braceIdx),
  };
}

/**
 * Map internal metric types to Prometheus type strings.
 */
function prometheusType(type: MetricValue["type"]): string {
  switch (type) {
    case "counter":
      return "counter";
    case "gauge":
      return "gauge";
    case "histogram":
      return "histogram";
  }
}

/**
 * Format a single metric value as a Prometheus exposition line.
 *
 * @param metric - The metric value to format
 * @returns Formatted Prometheus line
 */
function formatMetricLine(metric: MetricValue): string {
  const { name, labels } = parseMetricKey(metric.name);
  return `${name}${labels} ${metric.value}`;
}

/**
 * Format an array of metrics into Prometheus text exposition format.
 *
 * Groups metrics by name and adds TYPE comments. Each metric is
 * rendered as `metric_name{labels} value`.
 *
 * @param snapshot - Array of MetricValue from getAllMetrics()
 * @returns Prometheus-compatible text string
 */
export function formatPrometheusMetrics(snapshot: MetricValue[]): string {
  if (snapshot.length === 0) {
    return "";
  }

  const lines: string[] = [];
  const seenTypes = new Set<string>();

  for (const metric of snapshot) {
    const { name } = parseMetricKey(metric.name);

    if (!seenTypes.has(name)) {
      seenTypes.add(name);
      lines.push(`# TYPE ${name} ${prometheusType(metric.type)}`);
    }

    lines.push(formatMetricLine(metric));
  }

  return lines.join("\n") + "\n";
}

/** Prometheus exporter interface. */
export interface PrometheusExporter {
  /** Generate Prometheus-formatted metrics text. */
  export(): string;
  /** Content type header value for Prometheus responses. */
  contentType: string;
}

/**
 * Create a Prometheus exporter that formats metrics on demand.
 *
 * @param getMetrics - Function that returns the current metrics snapshot
 * @returns PrometheusExporter instance
 */
export function createPrometheusExporter(
  getMetrics: () => MetricValue[],
): PrometheusExporter {
  return {
    export(): string {
      return formatPrometheusMetrics(getMetrics());
    },
    contentType: "text/plain; version=0.0.4; charset=utf-8",
  };
}
