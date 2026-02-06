/**
 * Analytics Query Engine
 *
 * Translates natural language queries into structured filters.
 * In future, integrates with AI SDK for "signups this week" style queries.
 * For now: structured query builder with safe SQL generation.
 */

import type { EventQueryOptions } from './types.js';

// ---------------------------------------------------------------------------
// Query Builder
// ---------------------------------------------------------------------------

export interface AnalyticsQuery {
  /** Describe what you want to know */
  question: string;

  /** Parsed event filters */
  filters: EventQueryOptions;

  /** Time range description */
  timeRange: string;
}

/**
 * Parse a natural language analytics question into structured filters.
 *
 * Supports patterns like:
 * - "signups this week"
 * - "page views today"
 * - "events last 7 days"
 * - "purchases since 2024-01-01"
 */
export function parseAnalyticsQuery(question: string): AnalyticsQuery {
  const now = new Date();
  const filters: EventQueryOptions = {};
  let timeRange = 'all time';

  // Normalize the input
  const q = question.toLowerCase().trim();

  // ---------------------------------------------------------------------------
  // Extract event name
  // ---------------------------------------------------------------------------
  const eventNameMap: Record<string, string> = {
    'signup': 'signup',
    'signups': 'signup',
    'page view': 'page_view',
    'page views': 'page_view',
    'pageview': 'page_view',
    'pageviews': 'page_view',
    'purchase': 'purchase',
    'purchases': 'purchase',
    'login': 'login',
    'logins': 'login',
    'click': 'click',
    'clicks': 'click',
    'error': 'error',
    'errors': 'error',
  };

  for (const [keyword, eventName] of Object.entries(eventNameMap)) {
    if (q.includes(keyword)) {
      filters.name = eventName;
      break;
    }
  }

  // ---------------------------------------------------------------------------
  // Extract time range
  // ---------------------------------------------------------------------------
  if (q.includes('today')) {
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    filters.since = startOfDay;
    timeRange = 'today';
  } else if (q.includes('yesterday')) {
    const startOfYesterday = new Date(now);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    startOfYesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(now);
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);
    endOfYesterday.setHours(23, 59, 59, 999);
    filters.since = startOfYesterday;
    filters.until = endOfYesterday;
    timeRange = 'yesterday';
  } else if (q.includes('this week')) {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    filters.since = startOfWeek;
    timeRange = 'this week';
  } else if (q.includes('this month')) {
    const startOfMonth = new Date(now);
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    filters.since = startOfMonth;
    timeRange = 'this month';
  } else {
    // "last N days" pattern
    const daysMatch = q.match(/last\s+(\d+)\s+days?/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1], 10);
      const since = new Date(now);
      since.setDate(since.getDate() - days);
      since.setHours(0, 0, 0, 0);
      filters.since = since;
      timeRange = `last ${days} days`;
    }

    // "last N hours" pattern
    const hoursMatch = q.match(/last\s+(\d+)\s+hours?/);
    if (hoursMatch) {
      const hours = parseInt(hoursMatch[1], 10);
      const since = new Date(now);
      since.setHours(since.getHours() - hours);
      filters.since = since;
      timeRange = `last ${hours} hours`;
    }
  }

  // ---------------------------------------------------------------------------
  // Extract limit
  // ---------------------------------------------------------------------------
  const limitMatch = q.match(/(?:top|first|limit)\s+(\d+)/);
  if (limitMatch) {
    filters.limit = parseInt(limitMatch[1], 10);
  }

  return {
    question,
    filters,
    timeRange,
  };
}

// ---------------------------------------------------------------------------
// Report Generator
// ---------------------------------------------------------------------------

export interface AnalyticsReport {
  title: string;
  timeRange: string;
  totalEvents: number;
  eventBreakdown: Array<{ name: string; count: number }>;
  generatedAt: Date;
}

export interface ReportDataProvider {
  getEvents(options?: EventQueryOptions): Promise<Array<{ name: string }>>;
  getEventCount(name?: string): Promise<number>;
}

/**
 * Generate a simple analytics report.
 */
export async function generateReport(
  provider: ReportDataProvider,
  options?: { since?: Date; until?: Date; title?: string },
): Promise<AnalyticsReport> {
  const filters: EventQueryOptions = {};
  if (options?.since) filters.since = options.since;
  if (options?.until) filters.until = options.until;

  const events = await provider.getEvents(filters);
  const totalEvents = events.length;

  // Count by event name
  const countMap = new Map<string, number>();
  for (const event of events) {
    const current = countMap.get(event.name) ?? 0;
    countMap.set(event.name, current + 1);
  }

  const eventBreakdown = Array.from(countMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  let timeRange = 'all time';
  if (options?.since && options?.until) {
    timeRange = `${options.since.toISOString()} to ${options.until.toISOString()}`;
  } else if (options?.since) {
    timeRange = `since ${options.since.toISOString()}`;
  }

  return {
    title: options?.title ?? 'Analytics Report',
    timeRange,
    totalEvents,
    eventBreakdown,
    generatedAt: new Date(),
  };
}
