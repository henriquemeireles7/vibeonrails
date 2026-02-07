import { describe, it, expect, beforeEach } from "vitest";
import { on, clearWebhookHandlers, getHandlerCount } from "../webhook.js";
import { createMemoryWebhookStore } from "../webhook-store.js";

describe("Webhook Handlers", () => {
  beforeEach(() => {
    clearWebhookHandlers();
  });

  it("registers a handler for an event type", () => {
    on("checkout.session.completed", () => {});
    expect(getHandlerCount("checkout.session.completed")).toBe(1);
  });

  it("registers multiple handlers for the same event", () => {
    on("invoice.payment_succeeded", () => {});
    on("invoice.payment_succeeded", () => {});
    expect(getHandlerCount("invoice.payment_succeeded")).toBe(2);
  });

  it("clears all handlers", () => {
    on("checkout.session.completed", () => {});
    on("invoice.payment_failed", () => {});
    clearWebhookHandlers();
    expect(getHandlerCount("checkout.session.completed")).toBe(0);
    expect(getHandlerCount("invoice.payment_failed")).toBe(0);
  });

  it("returns 0 for unregistered event types", () => {
    expect(getHandlerCount("customer.subscription.deleted")).toBe(0);
  });
});

describe("Webhook Idempotency Store", () => {
  it("tracks processed event IDs", async () => {
    const store = createMemoryWebhookStore();
    expect(await store.has("evt_001")).toBe(false);

    await store.add("evt_001");
    expect(await store.has("evt_001")).toBe(true);
  });

  it("returns false for unknown event IDs", async () => {
    const store = createMemoryWebhookStore();
    expect(await store.has("evt_unknown")).toBe(false);
  });

  it("clears all entries", async () => {
    const store = createMemoryWebhookStore();
    await store.add("evt_001");
    await store.add("evt_002");

    await store.clear();
    expect(await store.has("evt_001")).toBe(false);
    expect(await store.has("evt_002")).toBe(false);
  });

  it("evicts expired entries", async () => {
    const shortTtl = 10; // 10ms TTL
    const store = createMemoryWebhookStore(shortTtl);
    await store.add("evt_old");

    // Wait for TTL to expire
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(await store.has("evt_old")).toBe(false);
  });

  it("keeps non-expired entries", async () => {
    const store = createMemoryWebhookStore(60_000); // 60s TTL
    await store.add("evt_fresh");
    expect(await store.has("evt_fresh")).toBe(true);
  });
});
