/**
 * Webhook Idempotency Store
 *
 * Tracks processed Stripe event IDs to prevent duplicate processing.
 * Stripe explicitly sends duplicate webhook events. Without deduplication,
 * handlers may double-charge users, double-create accounts, etc.
 *
 * Two implementations:
 *   - MemoryWebhookStore: for dev/testing (not shared across instances)
 *   - WebhookStore interface: implement with Redis/DB for production
 *
 * Usage:
 *   import { createMemoryWebhookStore } from './webhook-store.js';
 *   const store = createMemoryWebhookStore();
 *   const alreadyProcessed = await store.has('evt_123');
 *   if (!alreadyProcessed) {
 *     await store.add('evt_123');
 *     // process event...
 *   }
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WebhookStore {
  /** Check if an event ID has already been processed */
  has(eventId: string): Promise<boolean>;
  /** Mark an event ID as processed */
  add(eventId: string): Promise<void>;
  /** Clear all entries (for testing) */
  clear(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Default TTL
// ---------------------------------------------------------------------------

/**
 * Events older than this are evicted from the store.
 * Stripe retries events for up to 72 hours, so 96h gives margin.
 */
const DEFAULT_TTL_MS = 96 * 60 * 60 * 1000; // 96 hours

// ---------------------------------------------------------------------------
// In-Memory Implementation (dev/testing)
// ---------------------------------------------------------------------------

interface StoreEntry {
  addedAt: number;
}

/**
 * Create an in-memory webhook idempotency store.
 *
 * Suitable for development and testing. For production, implement
 * the WebhookStore interface backed by Redis or a database table.
 *
 * @param ttlMs - How long to remember processed event IDs (default: 96 hours)
 */
export function createMemoryWebhookStore(ttlMs = DEFAULT_TTL_MS): WebhookStore {
  const store = new Map<string, StoreEntry>();

  function evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (now - entry.addedAt > ttlMs) {
        store.delete(key);
      }
    }
  }

  return {
    async has(eventId: string): Promise<boolean> {
      evictExpired();
      return store.has(eventId);
    },

    async add(eventId: string): Promise<void> {
      evictExpired();
      store.set(eventId, { addedAt: Date.now() });
    },

    async clear(): Promise<void> {
      store.clear();
    },
  };
}
