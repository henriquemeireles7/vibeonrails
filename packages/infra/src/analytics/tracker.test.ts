import { describe, it, expect, beforeEach } from 'vitest';
import { createTracker, createInMemoryEventStore, type EventStore } from './tracker.js';

let store: EventStore;

beforeEach(() => {
  store = createInMemoryEventStore();
});

describe('Analytics Tracker', () => {
  it('should track a custom event', async () => {
    const tracker = createTracker({
      store,
      config: { batchSize: 1, flushInterval: 0 },
    });

    tracker.track({
      name: 'signup',
      properties: { plan: 'pro' },
    });

    await tracker.flush();
    const events = await tracker.getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('signup');
    expect(events[0].properties).toEqual({ plan: 'pro' });
  });

  it('should track page views', async () => {
    const tracker = createTracker({
      store,
      config: { batchSize: 100, flushInterval: 0 },
    });

    tracker.trackPageView('/pricing');
    tracker.trackPageView('/features', { source: 'google' });

    await tracker.flush();
    const events = await tracker.getEvents({ name: 'page_view' });
    expect(events).toHaveLength(2);
    const urls = events.map((e) => e.pageUrl);
    expect(urls).toContain('/pricing');
    expect(urls).toContain('/features');
    const featuresEvent = events.find((e) => e.pageUrl === '/features');
    expect(featuresEvent?.properties).toEqual({ source: 'google' });
  });

  it('should auto-flush when batch size reached', async () => {
    const tracker = createTracker({
      store,
      config: { batchSize: 2, flushInterval: 0 },
    });

    tracker.track({ name: 'event1' });
    tracker.track({ name: 'event2' }); // Should trigger flush

    // Give it a moment for the async flush
    await new Promise((resolve) => setTimeout(resolve, 10));

    const count = await store.count();
    expect(count).toBe(2);
  });

  it('should query events by name', async () => {
    const tracker = createTracker({
      store,
      config: { batchSize: 100, flushInterval: 0 },
    });

    tracker.track({ name: 'signup' });
    tracker.track({ name: 'login' });
    tracker.track({ name: 'signup' });

    await tracker.flush();
    const signups = await tracker.getEvents({ name: 'signup' });
    expect(signups).toHaveLength(2);
  });

  it('should count events', async () => {
    const tracker = createTracker({
      store,
      config: { batchSize: 100, flushInterval: 0 },
    });

    tracker.track({ name: 'signup' });
    tracker.track({ name: 'login' });
    tracker.track({ name: 'signup' });

    const totalCount = await tracker.getEventCount();
    expect(totalCount).toBe(3);

    const signupCount = await tracker.getEventCount('signup');
    expect(signupCount).toBe(2);
  });

  it('should support pagination', async () => {
    const tracker = createTracker({
      store,
      config: { batchSize: 100, flushInterval: 0 },
    });

    for (let i = 0; i < 10; i++) {
      tracker.track({ name: `event-${i}` });
    }

    await tracker.flush();

    const page1 = await tracker.getEvents({ limit: 3 });
    expect(page1).toHaveLength(3);

    const page2 = await tracker.getEvents({ limit: 3, offset: 3 });
    expect(page2).toHaveLength(3);

    // No overlap
    const page1Names = page1.map((e) => e.name);
    const page2Names = page2.map((e) => e.name);
    for (const name of page1Names) {
      expect(page2Names).not.toContain(name);
    }
  });

  it('should include timestamp on events', async () => {
    const tracker = createTracker({
      store,
      config: { batchSize: 100, flushInterval: 0 },
    });

    const before = new Date();
    tracker.track({ name: 'test' });
    await tracker.flush();

    const events = await tracker.getEvents();
    expect(events[0].timestamp).toBeInstanceOf(Date);
    expect(events[0].timestamp.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
  });
});

describe('InMemoryEventStore', () => {
  it('should filter by date range', async () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    await store.write([
      {
        name: 'old',
        properties: {},
        timestamp: twoDaysAgo,
      },
      {
        name: 'recent',
        properties: {},
        timestamp: now,
      },
    ]);

    const recent = await store.query({ since: yesterday });
    expect(recent).toHaveLength(1);
    expect(recent[0].name).toBe('recent');
  });
});
