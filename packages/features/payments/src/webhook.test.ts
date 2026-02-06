import { describe, it, expect, beforeEach } from "vitest";
import { on, clearWebhookHandlers, getHandlerCount } from "./webhook.js";

describe("Webhook Handlers", () => {
  beforeEach(() => {
    clearWebhookHandlers();
  });

  it("registers a handler", () => {
    on("checkout.session.completed", () => {});
    expect(getHandlerCount("checkout.session.completed")).toBe(1);
  });

  it("registers multiple handlers for same event", () => {
    on("invoice.payment_succeeded", () => {});
    on("invoice.payment_succeeded", () => {});
    expect(getHandlerCount("invoice.payment_succeeded")).toBe(2);
  });

  it("clears handlers", () => {
    on("checkout.session.completed", () => {});
    clearWebhookHandlers();
    expect(getHandlerCount("checkout.session.completed")).toBe(0);
  });

  it("returns 0 for unregistered events", () => {
    expect(getHandlerCount("customer.subscription.deleted")).toBe(0);
  });
});
