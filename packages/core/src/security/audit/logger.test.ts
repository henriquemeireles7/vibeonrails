import { describe, it, expect, beforeEach } from "vitest";
import { audit, registerAuditSink, getAuditSinkCount } from "./logger.js";

describe("Audit Logger", () => {
  beforeEach(() => {
    registerAuditSink(); // Reset to default
  });

  it("emits an audit event", async () => {
    const events: unknown[] = [];
    registerAuditSink((e) => { events.push(e); });

    await audit("auth.login", { userId: "user-1", ip: "127.0.0.1" });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "auth.login",
      userId: "user-1",
      ip: "127.0.0.1",
    });
  });

  it("includes a timestamp", async () => {
    const events: Record<string, unknown>[] = [];
    registerAuditSink((e) => { events.push(e); });

    await audit("auth.logout");

    expect(events[0]).toHaveProperty("timestamp");
    expect(typeof events[0]!["timestamp"]).toBe("string");
  });

  it("supports multiple sinks", async () => {
    const a: unknown[] = [];
    const b: unknown[] = [];
    registerAuditSink((e) => { a.push(e); });
    registerAuditSink((e) => { b.push(e); });

    await audit("auth.register", { userId: "user-2" });

    // Default sink + 2 custom = 3 calls, but we check custom sinks
    expect(a).toHaveLength(1);
    expect(b).toHaveLength(1);
  });

  it("tracks sink count", () => {
    expect(getAuditSinkCount()).toBe(1); // Default console sink
    registerAuditSink(() => {});
    expect(getAuditSinkCount()).toBe(2);
  });

  it("supports metadata", async () => {
    const events: Record<string, unknown>[] = [];
    registerAuditSink((e) => { events.push(e); });

    await audit("auth.role_change", {
      userId: "user-1",
      targetId: "user-2",
      metadata: { from: "user", to: "admin" },
    });

    expect(events[0]).toMatchObject({
      type: "auth.role_change",
      metadata: { from: "user", to: "admin" },
    });
  });
});
