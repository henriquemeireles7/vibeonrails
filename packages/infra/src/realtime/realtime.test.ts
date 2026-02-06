import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  registerClient,
  removeClient,
  getConnectedClients,
  onMessage,
  dispatchMessage,
  sendToClient,
  broadcast,
  resetWebSocket,
} from "./server.js";
import {
  subscribe,
  unsubscribe,
  unsubscribeAll,
  getSubscribers,
  getChannels,
  clearChannels,
} from "./channels.js";

function mockClient(id: string) {
  return { id, send: vi.fn(), close: vi.fn() };
}

describe("WebSocket Server", () => {
  beforeEach(() => {
    resetWebSocket();
  });

  it("registers and removes clients", () => {
    registerClient(mockClient("c1"));
    registerClient(mockClient("c2"));
    expect(getConnectedClients()).toHaveLength(2);
    removeClient("c1");
    expect(getConnectedClients()).toHaveLength(1);
  });

  it("sends to a specific client", () => {
    const c = mockClient("c1");
    registerClient(c);
    sendToClient("c1", { type: "hello" });
    expect(c.send).toHaveBeenCalledWith(JSON.stringify({ type: "hello" }));
  });

  it("returns false when sending to unknown client", () => {
    expect(sendToClient("unknown", { type: "test" })).toBe(false);
  });

  it("broadcasts to all clients", () => {
    const c1 = mockClient("c1");
    const c2 = mockClient("c2");
    registerClient(c1);
    registerClient(c2);
    broadcast({ type: "update", payload: 42 });
    expect(c1.send).toHaveBeenCalled();
    expect(c2.send).toHaveBeenCalled();
  });

  it("dispatches messages to handlers", async () => {
    const handler = vi.fn();
    onMessage("chat", handler);

    const c = mockClient("c1");
    registerClient(c);
    await dispatchMessage(c, { type: "chat", payload: "hello" });

    expect(handler).toHaveBeenCalledWith(c, { type: "chat", payload: "hello" });
  });
});

describe("Channels", () => {
  beforeEach(() => {
    clearChannels();
  });

  it("subscribes and gets subscribers", () => {
    subscribe("room-1", "c1");
    subscribe("room-1", "c2");
    expect(getSubscribers("room-1")).toEqual(["c1", "c2"]);
  });

  it("unsubscribes a client", () => {
    subscribe("room-1", "c1");
    subscribe("room-1", "c2");
    unsubscribe("room-1", "c1");
    expect(getSubscribers("room-1")).toEqual(["c2"]);
  });

  it("removes empty channels", () => {
    subscribe("room-1", "c1");
    unsubscribe("room-1", "c1");
    expect(getChannels()).toHaveLength(0);
  });

  it("unsubscribes from all channels", () => {
    subscribe("room-1", "c1");
    subscribe("room-2", "c1");
    unsubscribeAll("c1");
    expect(getSubscribers("room-1")).toHaveLength(0);
    expect(getSubscribers("room-2")).toHaveLength(0);
  });

  it("lists active channels", () => {
    subscribe("a", "c1");
    subscribe("b", "c1");
    expect(getChannels()).toEqual(["a", "b"]);
  });
});
