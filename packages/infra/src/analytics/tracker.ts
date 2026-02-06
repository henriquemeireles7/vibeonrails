/**
 * Analytics Tracker — Server-Side Implementation
 *
 * In-memory event buffer with periodic flushing.
 * Stores events for querying. In production, events would be
 * written to Postgres via the analytics schema.
 */

import {
  type AnalyticsEvent,
  type AnalyticsEventInput,
  type AnalyticsTracker,
  type AnalyticsConfig,
  type EventQueryOptions,
  AnalyticsEventSchema,
  AnalyticsConfigSchema,
} from './types.js';

// ---------------------------------------------------------------------------
// In-Memory Event Store
// ---------------------------------------------------------------------------

export interface EventStore {
  write(events: AnalyticsEvent[]): Promise<void>;
  query(options?: EventQueryOptions): Promise<AnalyticsEvent[]>;
  count(name?: string): Promise<number>;
}

/**
 * Create an in-memory event store (for development/testing).
 */
export function createInMemoryEventStore(): EventStore {
  const events: AnalyticsEvent[] = [];

  return {
    async write(newEvents: AnalyticsEvent[]): Promise<void> {
      events.push(...newEvents);
    },

    async query(options?: EventQueryOptions): Promise<AnalyticsEvent[]> {
      let filtered = [...events];

      if (options?.name) {
        filtered = filtered.filter((e) => e.name === options.name);
      }
      if (options?.since) {
        filtered = filtered.filter(
          (e) => e.timestamp >= options.since!,
        );
      }
      if (options?.until) {
        filtered = filtered.filter(
          (e) => e.timestamp <= options.until!,
        );
      }

      // Sort by timestamp descending
      filtered.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );

      if (options?.offset) {
        filtered = filtered.slice(options.offset);
      }
      if (options?.limit) {
        filtered = filtered.slice(0, options.limit);
      }

      return filtered;
    },

    async count(name?: string): Promise<number> {
      if (name) {
        return events.filter((e) => e.name === name).length;
      }
      return events.length;
    },
  };
}

// ---------------------------------------------------------------------------
// Tracker Implementation
// ---------------------------------------------------------------------------

/**
 * Create an analytics tracker.
 *
 * @example
 * ```ts
 * const tracker = createTracker({
 *   store: createInMemoryEventStore(),
 * });
 *
 * tracker.track({ name: 'signup', properties: { plan: 'pro' } });
 * tracker.trackPageView('/pricing');
 * ```
 */
export function createTracker(options: {
  store: EventStore;
  config?: Partial<AnalyticsConfig>;
}): AnalyticsTracker {
  const config = AnalyticsConfigSchema.parse(options.config ?? {});
  const store = options.store;
  const buffer: AnalyticsEvent[] = [];
  let flushTimer: ReturnType<typeof setInterval> | null = null;

  async function flushBuffer(): Promise<void> {
    if (buffer.length === 0) return;
    const toFlush = buffer.splice(0, buffer.length);
    await store.write(toFlush);
  }

  // Start periodic flush
  if (config.flushInterval > 0) {
    flushTimer = setInterval(() => {
      flushBuffer().catch(() => {
        // Silently ignore flush errors
      });
    }, config.flushInterval);

    // Don't keep the process alive just for analytics
    if (typeof flushTimer === 'object' && 'unref' in flushTimer) {
      flushTimer.unref();
    }
  }

  return {
    track(event: Omit<AnalyticsEventInput, 'timestamp'>): void {
      const fullEvent = AnalyticsEventSchema.parse({
        ...event,
        timestamp: new Date(),
      });
      buffer.push(fullEvent);

      // Auto-flush when buffer reaches batch size
      if (buffer.length >= config.batchSize) {
        flushBuffer().catch(() => {});
      }
    },

    trackPageView(
      url: string,
      properties?: Record<string, unknown>,
    ): void {
      this.track({
        name: 'page_view',
        pageUrl: url,
        properties: properties ?? {},
      });
    },

    async flush(): Promise<void> {
      if (flushTimer) {
        clearInterval(flushTimer);
        flushTimer = null;
      }
      await flushBuffer();
    },

    async getEvents(
      options?: EventQueryOptions,
    ): Promise<AnalyticsEvent[]> {
      // Flush buffer first to ensure all events are queryable
      await flushBuffer();
      return store.query(options);
    },

    async getEventCount(name?: string): Promise<number> {
      await flushBuffer();
      return store.count(name);
    },
  };
}
