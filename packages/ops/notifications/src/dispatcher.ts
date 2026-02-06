/**
 * Notifications — Dispatcher
 *
 * Multi-channel notification dispatch with:
 * - User preference checking
 * - Digest batching
 * - Markdown template rendering
 * - Channel-specific formatting
 *
 * Usage:
 *   import { createDispatcher, dispatch } from '@vibeonrails/notifications';
 *
 *   const dispatcher = createDispatcher({ senders: { email: emailSender } });
 *   const result = await dispatcher.dispatch({ type: 'ticket_escalated', ... });
 */

import {
  type Notification,
  type NotificationChannel,
  type NotificationPreferences,
  type DispatchInput,
  type DispatchResult,
  type ChannelSender,
  type DigestEntry,
  NOTIFICATION_CHANNELS,
} from "./types.js";

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

let idCounter = 0;

function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now()}_${idCounter}`;
}

// ---------------------------------------------------------------------------
// Preference Checking
// ---------------------------------------------------------------------------

/**
 * Check if a notification should be sent to a specific channel
 * based on user preferences.
 */
export function shouldNotify(
  preferences: NotificationPreferences,
  channel: NotificationChannel,
  type: DispatchInput["type"],
): boolean {
  // Global kill switch
  if (!preferences.enabled) return false;

  // Check channel preference
  const channelPref = preferences.channels[channel];
  if (channelPref && !channelPref.enabled) return false;

  // Check quiet hours for channel
  if (channelPref?.quietStart && channelPref?.quietEnd) {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    if (channelPref.quietStart <= channelPref.quietEnd) {
      // Normal range (e.g., 22:00 to 08:00 is NOT this case)
      if (
        currentTime >= channelPref.quietStart &&
        currentTime < channelPref.quietEnd
      ) {
        return false;
      }
    } else {
      // Overnight range (e.g., 22:00 to 08:00)
      if (
        currentTime >= channelPref.quietStart ||
        currentTime < channelPref.quietEnd
      ) {
        return false;
      }
    }
  }

  // Check type-specific overrides
  const typeOverride = preferences.typeOverrides[type];
  if (typeOverride) {
    if (!typeOverride.enabled) return false;
    if (typeOverride.channels && !typeOverride.channels.includes(channel)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a notification should be batched into a digest.
 */
export function shouldBatchForDigest(
  preferences: NotificationPreferences,
  channel: NotificationChannel,
  priority: string,
): boolean {
  // Never batch urgent/high priority notifications
  if (priority === "urgent" || priority === "high") return false;

  // Only batch if digest is enabled
  if (!preferences.digest.enabled) return false;

  // Only batch email and in-app
  return channel === "email" || channel === "in-app";
}

// ---------------------------------------------------------------------------
// Template Rendering
// ---------------------------------------------------------------------------

/**
 * Render a Markdown template by replacing {{variable}} placeholders.
 */
export function renderTemplate(
  template: string,
  data: Record<string, unknown>,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) =>
    String(data[key] ?? `{{${key}}}`),
  );
}

/**
 * Format a notification body for a specific channel.
 */
export function formatForChannel(
  body: string,
  channel: NotificationChannel,
): string {
  switch (channel) {
    case "email":
      // Email gets full Markdown
      return body;
    case "in-app":
      // In-app gets plain text (strip Markdown)
      return body
        .replace(/#{1,6}\s/g, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/\[(.+?)\]\(.+?\)/g, "$1")
        .trim();
    case "push":
      // Push gets truncated plain text
      return body
        .replace(/#{1,6}\s/g, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/\[(.+?)\]\(.+?\)/g, "$1")
        .trim()
        .slice(0, 200);
    case "discord":
      // Discord supports Markdown natively
      return body;
  }
}

// ---------------------------------------------------------------------------
// Dispatcher
// ---------------------------------------------------------------------------

export interface DispatcherConfig {
  /** Channel sender implementations */
  senders: Partial<Record<NotificationChannel, ChannelSender>>;

  /** Default preferences for users without explicit preferences */
  defaultPreferences?: Partial<NotificationPreferences>;

  /** Function to look up user preferences */
  getPreferences?: (userId: string) => Promise<NotificationPreferences | null>;
}

export interface Dispatcher {
  /** Dispatch a notification */
  dispatch(input: DispatchInput): Promise<DispatchResult>;

  /** Dispatch to a specific channel (bypasses preferences) */
  dispatchToChannel(
    notification: Notification,
    channel: NotificationChannel,
  ): Promise<{ sent: boolean; error?: string }>;

  /** Create a digest from batched notifications */
  createDigest(
    userId: string,
    entries: DigestEntry[],
    template: string,
  ): string;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  userId: "",
  enabled: true,
  channels: {},
  typeOverrides: {},
  digest: { enabled: false, frequency: "daily", sendAt: "09:00" },
};

/**
 * Create a notification dispatcher.
 */
export function createDispatcher(config: DispatcherConfig): Dispatcher {
  const { senders, getPreferences } = config;

  const defaultPrefs: NotificationPreferences = {
    ...DEFAULT_PREFERENCES,
    ...config.defaultPreferences,
    userId: config.defaultPreferences?.userId ?? "",
  };

  return {
    async dispatch(input: DispatchInput): Promise<DispatchResult> {
      const notificationId = generateId("notif");

      // Build the notification object
      const notification: Notification = {
        id: notificationId,
        type: input.type,
        recipientId: input.recipientId,
        title: input.title,
        body: input.body,
        priority: input.priority ?? "normal",
        channels: input.channels ?? [...NOTIFICATION_CHANNELS],
        data: input.data ?? {},
        createdAt: new Date().toISOString(),
        read: false,
        readAt: null,
        actionUrl: input.actionUrl,
        groupKey: input.groupKey,
      };

      // Get user preferences
      let preferences = defaultPrefs;
      if (getPreferences) {
        const userPrefs = await getPreferences(input.recipientId);
        if (userPrefs) {
          preferences = userPrefs;
        }
      }

      // Determine which channels to use
      const targetChannels = input.channels ?? [...NOTIFICATION_CHANNELS];

      const channelResults: DispatchResult["channelResults"] =
        {} as DispatchResult["channelResults"];
      let allSuppressed = true;

      for (const channel of targetChannels) {
        // Check preferences
        if (!shouldNotify(preferences, channel, input.type)) {
          channelResults[channel] = {
            sent: false,
            error: "suppressed_by_preferences",
          };
          continue;
        }

        // Check digest batching
        if (shouldBatchForDigest(preferences, channel, notification.priority)) {
          channelResults[channel] = { sent: false, batched: true };
          allSuppressed = false;
          continue;
        }

        // Format for channel
        const formattedNotification: Notification = {
          ...notification,
          body: formatForChannel(notification.body, channel),
        };

        // Send via channel sender
        const sender = senders[channel];
        if (!sender) {
          channelResults[channel] = {
            sent: false,
            error: "no_sender_configured",
          };
          continue;
        }

        try {
          const result = await sender(formattedNotification);
          channelResults[channel] = result;
          if (result.sent) {
            allSuppressed = false;
          }
        } catch (err) {
          channelResults[channel] = {
            sent: false,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }

      return {
        notificationId,
        channelResults,
        suppressed: allSuppressed,
      };
    },

    async dispatchToChannel(
      notification: Notification,
      channel: NotificationChannel,
    ): Promise<{ sent: boolean; error?: string }> {
      const sender = senders[channel];
      if (!sender) {
        return { sent: false, error: "no_sender_configured" };
      }

      const formatted: Notification = {
        ...notification,
        body: formatForChannel(notification.body, channel),
      };

      return sender(formatted);
    },

    createDigest(
      _userId: string,
      entries: DigestEntry[],
      template: string,
    ): string {
      const itemsList = entries
        .map(
          (e) =>
            `- **${e.title}** (${e.type})${e.actionUrl ? ` — [View](${e.actionUrl})` : ""}`,
        )
        .join("\n");

      return renderTemplate(template, {
        count: String(entries.length),
        items: itemsList,
        date: new Date().toLocaleDateString(),
      });
    },
  };
}

/**
 * Reset internal state. Used for testing.
 */
export function resetDispatcherState(): void {
  idCounter = 0;
}
