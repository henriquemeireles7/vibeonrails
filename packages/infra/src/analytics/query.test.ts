import { describe, it, expect } from 'vitest';
import { parseAnalyticsQuery, generateReport, type ReportDataProvider } from './query.js';

describe('parseAnalyticsQuery', () => {
  it('should parse "signups this week"', () => {
    const result = parseAnalyticsQuery('signups this week');
    expect(result.filters.name).toBe('signup');
    expect(result.timeRange).toBe('this week');
    expect(result.filters.since).toBeInstanceOf(Date);
  });

  it('should parse "page views today"', () => {
    const result = parseAnalyticsQuery('page views today');
    expect(result.filters.name).toBe('page_view');
    expect(result.timeRange).toBe('today');
    expect(result.filters.since).toBeInstanceOf(Date);
  });

  it('should parse "events last 7 days"', () => {
    const result = parseAnalyticsQuery('events last 7 days');
    expect(result.timeRange).toBe('last 7 days');
    expect(result.filters.since).toBeInstanceOf(Date);
  });

  it('should parse "purchases this month"', () => {
    const result = parseAnalyticsQuery('purchases this month');
    expect(result.filters.name).toBe('purchase');
    expect(result.timeRange).toBe('this month');
  });

  it('should parse "logins yesterday"', () => {
    const result = parseAnalyticsQuery('logins yesterday');
    expect(result.filters.name).toBe('login');
    expect(result.timeRange).toBe('yesterday');
    expect(result.filters.since).toBeInstanceOf(Date);
    expect(result.filters.until).toBeInstanceOf(Date);
  });

  it('should parse "last 24 hours"', () => {
    const result = parseAnalyticsQuery('errors last 24 hours');
    expect(result.filters.name).toBe('error');
    expect(result.timeRange).toBe('last 24 hours');
  });

  it('should parse "top 10 events"', () => {
    const result = parseAnalyticsQuery('top 10 events');
    expect(result.filters.limit).toBe(10);
  });

  it('should handle no time range', () => {
    const result = parseAnalyticsQuery('all signups');
    expect(result.filters.name).toBe('signup');
    expect(result.timeRange).toBe('all time');
    expect(result.filters.since).toBeUndefined();
  });

  it('should preserve the original question', () => {
    const result = parseAnalyticsQuery('How many signups this week?');
    expect(result.question).toBe('How many signups this week?');
  });
});

describe('generateReport', () => {
  it('should generate a report with event breakdown', async () => {
    const provider: ReportDataProvider = {
      async getEvents() {
        return [
          { name: 'signup' },
          { name: 'signup' },
          { name: 'page_view' },
          { name: 'page_view' },
          { name: 'page_view' },
          { name: 'purchase' },
        ];
      },
      async getEventCount() {
        return 6;
      },
    };

    const report = await generateReport(provider);
    expect(report.title).toBe('Analytics Report');
    expect(report.totalEvents).toBe(6);
    expect(report.eventBreakdown).toHaveLength(3);
    // Sorted by count desc
    expect(report.eventBreakdown[0].name).toBe('page_view');
    expect(report.eventBreakdown[0].count).toBe(3);
    expect(report.eventBreakdown[1].name).toBe('signup');
    expect(report.eventBreakdown[1].count).toBe(2);
  });

  it('should handle empty events', async () => {
    const provider: ReportDataProvider = {
      async getEvents() {
        return [];
      },
      async getEventCount() {
        return 0;
      },
    };

    const report = await generateReport(provider);
    expect(report.totalEvents).toBe(0);
    expect(report.eventBreakdown).toHaveLength(0);
  });

  it('should include custom title', async () => {
    const provider: ReportDataProvider = {
      async getEvents() {
        return [];
      },
      async getEventCount() {
        return 0;
      },
    };

    const report = await generateReport(provider, { title: 'Weekly Report' });
    expect(report.title).toBe('Weekly Report');
  });

  it('should describe time range', async () => {
    const since = new Date('2024-01-01');
    const provider: ReportDataProvider = {
      async getEvents() {
        return [];
      },
      async getEventCount() {
        return 0;
      },
    };

    const report = await generateReport(provider, { since });
    expect(report.timeRange).toContain('since');
  });
});
