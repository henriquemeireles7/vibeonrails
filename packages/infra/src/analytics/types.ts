/**
 * Analytics — Types
 *
 * Privacy-first event tracking. Server-side by default, no cookies.
 * Optional client-side script for richer engagement data.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Analytics Event
// ---------------------------------------------------------------------------

export const AnalyticsEventSchema = z.object({
  /** Event name (e.g., "page_view", "signup", "purchase") */
  name: z.string().min(1).max(255),

  /** Event properties */
  properties: z.record(z.string(), z.unknown()).default({}),

  /** Session ID (generated per visit, no cookies) */
  sessionId: z.string().optional(),

  /** Page URL */
  pageUrl: z.string().optional(),

  /** Referrer URL */
  referrer: z.string().optional(),

  /** User agent string */
  userAgent: z.string().optional(),

  /** User ID (if authenticated) */
  userId: z.string().optional(),

  /** Event timestamp */
  timestamp: z.date().default(() => new Date()),
});

export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

/** Input type — fields with `.default()` (properties, timestamp) are optional. */
export type AnalyticsEventInput = z.input<typeof AnalyticsEventSchema>;

// ---------------------------------------------------------------------------
// Analytics Config
// ---------------------------------------------------------------------------

export const AnalyticsConfigSchema = z.object({
  /** Enable server-side tracking (default: true) */
  serverSide: z.boolean().default(true),

  /** Enable client-side script (default: false) */
  clientSide: z.boolean().default(false),

  /** Events to auto-track */
  autoTrack: z.object({
    pageViews: z.boolean().default(true),
    apiCalls: z.boolean().default(true),
    authEvents: z.boolean().default(true),
  }).default({}),

  /** Batch size for writing events (default: 10) */
  batchSize: z.number().int().positive().default(10),

  /** Flush interval in ms (default: 5000, 0 to disable) */
  flushInterval: z.number().int().nonnegative().default(5000),
});

export type AnalyticsConfig = z.infer<typeof AnalyticsConfigSchema>;

// ---------------------------------------------------------------------------
// Tracker Interface
// ---------------------------------------------------------------------------

export interface AnalyticsTracker {
  /** Track a custom event */
  track(event: Omit<AnalyticsEventInput, 'timestamp'>): void;

  /** Track a page view */
  trackPageView(url: string, properties?: Record<string, unknown>): void;

  /** Flush buffered events to storage */
  flush(): Promise<void>;

  /** Get all tracked events (for querying) */
  getEvents(options?: EventQueryOptions): Promise<AnalyticsEvent[]>;

  /** Get event count */
  getEventCount(name?: string): Promise<number>;
}

export interface EventQueryOptions {
  /** Filter by event name */
  name?: string;

  /** Filter by date range */
  since?: Date;
  until?: Date;

  /** Limit results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}

// ---------------------------------------------------------------------------
// Client-Side Event Types
// ---------------------------------------------------------------------------

export interface ClientAnalyticsEvent {
  type: 'page_view' | 'click' | 'scroll' | 'error' | 'custom';
  name: string;
  properties: Record<string, unknown>;
  timestamp: number;
  url: string;
  sessionId: string;
}
