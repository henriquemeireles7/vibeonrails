/**
 * Notifications — Dispatcher Tests
 *
 * Tests for multi-channel dispatch, preference filtering,
 * digest batching, and template rendering.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createDispatcher,
  shouldNotify,
  shouldBatchForDigest,
  renderTemplate,
  formatForChannel,
  resetDispatcherState,
} from "./dispatcher.js";
import type {
  NotificationPreferences,
  ChannelSender,
  Notification,
} from "./types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePreferences(
  overrides: Partial<NotificationPreferences> = {},
): NotificationPreferences {
  return {
    userId: "user_1",
    enabled: true,
    channels: {},
    typeOverrides: {},
    digest: { enabled: false, frequency: "daily", sendAt: "09:00" },
    ...overrides,
  };
}

function createMockSender(): ChannelSender {
  return vi.fn().mockResolvedValue({ sent: true });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("shouldNotify", () => {
  it("should return true for default preferences", () => {
    const prefs = makePreferences();
    expect(shouldNotify(prefs, "email", "ticket_created")).toBe(true);
  });

  it("should return false when globally disabled", () => {
    const prefs = makePreferences({ enabled: false });
    expect(shouldNotify(prefs, "email", "ticket_created")).toBe(false);
  });

  it("should return false when channel is disabled", () => {
    const prefs = makePreferences({
      channels: { email: { enabled: false, quietStart: null, quietEnd: null } },
    });
    expect(shouldNotify(prefs, "email", "ticket_created")).toBe(false);
  });

  it("should return true when channel is enabled", () => {
    const prefs = makePreferences({
      channels: { email: { enabled: true, quietStart: null, quietEnd: null } },
    });
    expect(shouldNotify(prefs, "email", "ticket_created")).toBe(true);
  });

  it("should return false when type is disabled", () => {
    const prefs = makePreferences({
      typeOverrides: { ticket_created: { enabled: false } },
    });
    expect(shouldNotify(prefs, "email", "ticket_created")).toBe(false);
  });

  it("should return false when type excludes the channel", () => {
    const prefs = makePreferences({
      typeOverrides: {
        ticket_created: { enabled: true, channels: ["discord"] },
      },
    });
    expect(shouldNotify(prefs, "email", "ticket_created")).toBe(false);
  });
});

describe("shouldBatchForDigest", () => {
  it("should not batch when digest is disabled", () => {
    const prefs = makePreferences();
    expect(shouldBatchForDigest(prefs, "email", "normal")).toBe(false);
  });

  it("should batch low priority email when digest enabled", () => {
    const prefs = makePreferences({
      digest: { enabled: true, frequency: "daily", sendAt: "09:00" },
    });
    expect(shouldBatchForDigest(prefs, "email", "low")).toBe(true);
    expect(shouldBatchForDigest(prefs, "email", "normal")).toBe(true);
  });

  it("should never batch urgent notifications", () => {
    const prefs = makePreferences({
      digest: { enabled: true, frequency: "daily", sendAt: "09:00" },
    });
    expect(shouldBatchForDigest(prefs, "email", "urgent")).toBe(false);
    expect(shouldBatchForDigest(prefs, "email", "high")).toBe(false);
  });

  it("should not batch discord notifications", () => {
    const prefs = makePreferences({
      digest: { enabled: true, frequency: "daily", sendAt: "09:00" },
    });
    expect(shouldBatchForDigest(prefs, "discord", "normal")).toBe(false);
  });

  it("should batch in-app notifications", () => {
    const prefs = makePreferences({
      digest: { enabled: true, frequency: "daily", sendAt: "09:00" },
    });
    expect(shouldBatchForDigest(prefs, "in-app", "normal")).toBe(true);
  });
});

describe("renderTemplate", () => {
  it("should replace template variables", () => {
    const result = renderTemplate(
      "Hello {{name}}, your order #{{orderId}} is ready.",
      { name: "John", orderId: "12345" },
    );
    expect(result).toBe("Hello John, your order #12345 is ready.");
  });

  it("should preserve unreplaced variables", () => {
    const result = renderTemplate("Hello {{name}}, {{missing}} here.", {
      name: "Jane",
    });
    expect(result).toBe("Hello Jane, {{missing}} here.");
  });

  it("should handle empty data", () => {
    const result = renderTemplate("No vars here.", {});
    expect(result).toBe("No vars here.");
  });
});

describe("formatForChannel", () => {
  const markdown = "# Title\n\n**Bold** text with [link](http://example.com)";

  it("should keep markdown for email", () => {
    expect(formatForChannel(markdown, "email")).toBe(markdown);
  });

  it("should strip markdown for in-app", () => {
    const result = formatForChannel(markdown, "in-app");
    expect(result).not.toContain("#");
    expect(result).not.toContain("**");
    expect(result).toContain("Bold");
    expect(result).toContain("link");
  });

  it("should truncate for push", () => {
    const longBody = "# Title\n\n" + "a".repeat(300);
    const result = formatForChannel(longBody, "push");
    expect(result.length).toBeLessThanOrEqual(200);
  });

  it("should keep markdown for discord", () => {
    expect(formatForChannel(markdown, "discord")).toBe(markdown);
  });
});

describe("createDispatcher", () => {
  beforeEach(() => {
    resetDispatcherState();
  });

  it("should dispatch to configured channels", async () => {
    const emailSender = createMockSender();
    const dispatcher = createDispatcher({
      senders: { email: emailSender },
    });

    const result = await dispatcher.dispatch({
      type: "ticket_created",
      recipientId: "user_1",
      title: "New Ticket",
      body: "A new ticket was created.",
      channels: ["email"],
    });

    expect(result.notificationId).toMatch(/^notif_/);
    expect(result.channelResults.email.sent).toBe(true);
    expect(emailSender).toHaveBeenCalledOnce();
  });

  it("should suppress when preferences disable channel", async () => {
    const emailSender = createMockSender();
    const dispatcher = createDispatcher({
      senders: { email: emailSender },
      getPreferences: async () =>
        makePreferences({
          channels: {
            email: { enabled: false, quietStart: null, quietEnd: null },
          },
        }),
    });

    const result = await dispatcher.dispatch({
      type: "ticket_created",
      recipientId: "user_1",
      title: "Test",
      body: "Test",
      channels: ["email"],
    });

    expect(result.channelResults.email.sent).toBe(false);
    expect(result.channelResults.email.error).toBe("suppressed_by_preferences");
    expect(emailSender).not.toHaveBeenCalled();
  });

  it("should batch low priority for digest", async () => {
    const emailSender = createMockSender();
    const dispatcher = createDispatcher({
      senders: { email: emailSender },
      getPreferences: async () =>
        makePreferences({
          digest: { enabled: true, frequency: "daily", sendAt: "09:00" },
        }),
    });

    const result = await dispatcher.dispatch({
      type: "ticket_created",
      recipientId: "user_1",
      title: "Test",
      body: "Test",
      channels: ["email"],
      priority: "low",
    });

    expect(result.channelResults.email.batched).toBe(true);
    expect(emailSender).not.toHaveBeenCalled();
  });

  it("should not batch urgent notifications", async () => {
    const emailSender = createMockSender();
    const dispatcher = createDispatcher({
      senders: { email: emailSender },
      getPreferences: async () =>
        makePreferences({
          digest: { enabled: true, frequency: "daily", sendAt: "09:00" },
        }),
    });

    const result = await dispatcher.dispatch({
      type: "ticket_escalated",
      recipientId: "user_1",
      title: "Urgent",
      body: "Urgent issue",
      channels: ["email"],
      priority: "urgent",
    });

    expect(result.channelResults.email.sent).toBe(true);
    expect(emailSender).toHaveBeenCalledOnce();
  });

  it("should report no_sender_configured for missing channels", async () => {
    const dispatcher = createDispatcher({ senders: {} });

    const result = await dispatcher.dispatch({
      type: "ticket_created",
      recipientId: "user_1",
      title: "Test",
      body: "Test",
      channels: ["push"],
    });

    expect(result.channelResults.push.sent).toBe(false);
    expect(result.channelResults.push.error).toBe("no_sender_configured");
  });

  it("should handle sender errors gracefully", async () => {
    const failingSender: ChannelSender = vi
      .fn()
      .mockRejectedValue(new Error("Network error"));

    const dispatcher = createDispatcher({
      senders: { email: failingSender },
    });

    const result = await dispatcher.dispatch({
      type: "ticket_created",
      recipientId: "user_1",
      title: "Test",
      body: "Test",
      channels: ["email"],
    });

    expect(result.channelResults.email.sent).toBe(false);
    expect(result.channelResults.email.error).toBe("Network error");
  });

  it("should dispatch to multiple channels", async () => {
    const emailSender = createMockSender();
    const discordSender = createMockSender();

    const dispatcher = createDispatcher({
      senders: { email: emailSender, discord: discordSender },
    });

    const result = await dispatcher.dispatch({
      type: "ticket_created",
      recipientId: "user_1",
      title: "Test",
      body: "Test body",
      channels: ["email", "discord"],
    });

    expect(result.channelResults.email.sent).toBe(true);
    expect(result.channelResults.discord.sent).toBe(true);
  });

  it("should create digest from entries", () => {
    const dispatcher = createDispatcher({ senders: {} });

    const digest = dispatcher.createDigest(
      "user_1",
      [
        {
          notificationId: "n1",
          type: "ticket_created",
          title: "New Ticket #1",
          excerpt: "A new ticket was created",
          createdAt: new Date().toISOString(),
          actionUrl: "/tickets/1",
        },
        {
          notificationId: "n2",
          type: "deploy_success",
          title: "Deploy v2.0",
          excerpt: "Deployment succeeded",
          createdAt: new Date().toISOString(),
        },
      ],
      "You have {{count}} notifications:\n\n{{items}}",
    );

    expect(digest).toContain("2 notifications");
    expect(digest).toContain("New Ticket #1");
    expect(digest).toContain("Deploy v2.0");
  });
});
