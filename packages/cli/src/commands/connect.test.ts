/**
 * Connect CLI — Tests
 *
 * Tests connect flow (mocked token store), list connections, disconnect cleanup.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  executeConnect,
  listConnections,
  executeDisconnect,
  formatConnectionsList,
} from "./connect.js";

// ---------------------------------------------------------------------------
// Mock Token Store
// ---------------------------------------------------------------------------

function createMockTokenStore() {
  const tokens = new Map<string, Record<string, unknown>>();

  return {
    async get(provider: string) {
      return (
        (tokens.get(provider) as
          | {
              provider: string;
              accessToken: string;
              scopes: string[];
              storedAt: string;
            }
          | undefined) ?? null
      );
    },
    async set(provider: string, token: Record<string, unknown>) {
      tokens.set(provider, token);
    },
    async remove(provider: string) {
      if (!tokens.has(provider)) return false;
      tokens.delete(provider);
      return true;
    },
    async list() {
      return Array.from(tokens.keys());
    },
    async has(provider: string) {
      return tokens.has(provider);
    },
    _tokens: tokens,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("executeConnect", () => {
  let tokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(() => {
    tokenStore = createMockTokenStore();
  });

  it("should connect with API key", async () => {
    const result = await executeConnect("stripe", tokenStore, {
      accessToken: "sk_test_123",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Connected to Stripe");
    expect(await tokenStore.has("stripe")).toBe(true);
  });

  it("should connect with OAuth token", async () => {
    const result = await executeConnect("twitter", tokenStore, {
      accessToken: "oauth_token_123",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Connected to Twitter");
  });

  it("should connect bluesky with handle", async () => {
    const result = await executeConnect("bluesky", tokenStore, {
      accessToken: "app_password_123",
      handle: "user.bsky.social",
    });

    expect(result.success).toBe(true);
    const token = await tokenStore.get("bluesky");
    expect(token).not.toBeNull();
  });

  it("should reject unknown provider", async () => {
    const result = await executeConnect("instagram", tokenStore);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Unknown provider");
  });

  it("should reject if already connected", async () => {
    await executeConnect("twitter", tokenStore, { accessToken: "token1" });
    const result = await executeConnect("twitter", tokenStore, {
      accessToken: "token2",
    });

    expect(result.success).toBe(false);
    expect(result.message).toContain("Already connected");
  });

  it("should require token for API key providers", async () => {
    const result = await executeConnect("stripe", tokenStore);

    expect(result.success).toBe(false);
    expect(result.message).toContain("provide an access token");
  });

  it("should require token for OAuth providers", async () => {
    const result = await executeConnect("twitter", tokenStore);

    expect(result.success).toBe(false);
    expect(result.message).toContain("requires a token");
  });
});

describe("listConnections", () => {
  let tokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(() => {
    tokenStore = createMockTokenStore();
  });

  it("should list all providers with status", async () => {
    await executeConnect("twitter", tokenStore, { accessToken: "token" });

    const connections = await listConnections(tokenStore);

    expect(connections.length).toBe(3); // twitter, bluesky, stripe
    const twitter = connections.find((c) => c.provider === "twitter");
    const bluesky = connections.find((c) => c.provider === "bluesky");

    expect(twitter!.connected).toBe(true);
    expect(bluesky!.connected).toBe(false);
  });

  it("should show all disconnected when empty", async () => {
    const connections = await listConnections(tokenStore);
    expect(connections.every((c) => !c.connected)).toBe(true);
  });
});

describe("executeDisconnect", () => {
  let tokenStore: ReturnType<typeof createMockTokenStore>;

  beforeEach(async () => {
    tokenStore = createMockTokenStore();
    await executeConnect("twitter", tokenStore, { accessToken: "token" });
  });

  it("should disconnect a connected provider", async () => {
    const result = await executeDisconnect("twitter", tokenStore);

    expect(result.success).toBe(true);
    expect(result.message).toContain("Disconnected");
    expect(await tokenStore.has("twitter")).toBe(false);
  });

  it("should fail for not connected provider", async () => {
    const result = await executeDisconnect("stripe", tokenStore);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Not connected");
  });

  it("should reject unknown provider", async () => {
    const result = await executeDisconnect("instagram", tokenStore);

    expect(result.success).toBe(false);
    expect(result.message).toContain("Unknown provider");
  });
});

describe("formatConnectionsList", () => {
  it("should format connections with status indicators", () => {
    const output = formatConnectionsList([
      {
        provider: "twitter",
        displayName: "Twitter / X",
        connected: true,
        authType: "oauth",
        storedAt: "2026-01-15T10:00:00.000Z",
      },
      {
        provider: "bluesky",
        displayName: "Bluesky",
        connected: false,
        authType: "api-key",
        storedAt: null,
      },
    ]);

    expect(output).toContain("+ Twitter / X [OAuth]");
    expect(output).toContain("- Bluesky [API Key]");
    expect(output).toContain("1/2 connected");
  });

  it("should show date for connected providers", () => {
    const output = formatConnectionsList([
      {
        provider: "stripe",
        displayName: "Stripe",
        connected: true,
        authType: "api-key",
        storedAt: "2026-02-01T00:00:00.000Z",
      },
    ]);

    expect(output).toContain("2026-02-01");
  });
});
