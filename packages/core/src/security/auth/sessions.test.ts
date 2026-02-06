import { describe, it, expect } from "vitest";
import { createMemorySessionStore, createSessionManager } from "./sessions.js";

describe("SessionManager", () => {
  function setup() {
    const store = createMemorySessionStore();
    const manager = createSessionManager(store, 60_000); // 1 min TTL
    return { store, manager };
  }

  it("creates a session and returns a session ID", async () => {
    const { manager } = setup();
    const id = await manager.create("user-1", "admin");
    expect(id).toBeDefined();
    expect(typeof id).toBe("string");
    expect(id.length).toBe(64); // 32 bytes hex
  });

  it("validates an existing session", async () => {
    const { manager } = setup();
    const id = await manager.create("user-1", "admin");
    const data = await manager.validate(id);
    expect(data).not.toBeNull();
    expect(data!.userId).toBe("user-1");
    expect(data!.role).toBe("admin");
  });

  it("returns null for an unknown session", async () => {
    const { manager } = setup();
    const data = await manager.validate("nonexistent");
    expect(data).toBeNull();
  });

  it("revokes a session", async () => {
    const { manager } = setup();
    const id = await manager.create("user-1", "admin");
    await manager.revoke(id);
    const data = await manager.validate(id);
    expect(data).toBeNull();
  });

  it("expires sessions after TTL", async () => {
    const store = createMemorySessionStore();
    const manager = createSessionManager(store, 1); // 1ms TTL
    const id = await manager.create("user-1", "user");
    await new Promise((r) => setTimeout(r, 10));
    const data = await manager.validate(id);
    expect(data).toBeNull();
  });
});
