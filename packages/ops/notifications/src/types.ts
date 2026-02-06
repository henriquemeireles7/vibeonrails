/**
 * Notifications — Types
 *
 * Defines NotificationChannel, NotificationPreferences, DigestConfig,
 * and notification template types for multi-channel dispatch.
 *
 * Channels: email, in-app, push, discord
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Notification Channels
// ---------------------------------------------------------------------------

export const NOTIFICATION_CHANNELS = [
  "email",
  "in-app",
  "push",
  "discord",
] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NotificationChannelSchema = z.enum(NOTIFICATION_CHANNELS);

// ---------------------------------------------------------------------------
// Notification Types (events that trigger notifications)
// ---------------------------------------------------------------------------

export const NOTIFICATION_TYPES = [
  "ticket_created",
  "ticket_escalated",
  "ticket_resolved",
  "feedback_received",
  "deploy_success",
  "deploy_failure",
  "marketing_draft_ready",
  "marketing_posted",
  "finance_report",
  "changelog_published",
  "system_alert",
  "custom",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NotificationTypeSchema = z.enum(NOTIFICATION_TYPES);

// ---------------------------------------------------------------------------
// Notification Priority
// ---------------------------------------------------------------------------

export const NotificationPrioritySchema = z.enum([
  "low",
  "normal",
  "high",
  "urgent",
]);
export type NotificationPriority = z.infer<typeof NotificationPrioritySchema>;

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export const NotificationSchema = z.object({
  /** Unique notification identifier */
  id: z.string().min(1),

  /** Notification event type */
  type: NotificationTypeSchema,

  /** Recipient user ID */
  recipientId: z.string().min(1),

  /** Notification title */
  title: z.string().min(1),

  /** Notification body (Markdown) */
  body: z.string(),

  /** Priority level */
  priority: NotificationPrioritySchema.default("normal"),

  /** Target channels to deliver to */
  channels: z.array(NotificationChannelSchema).min(1),

  /** Structured data payload */
  data: z.record(z.string(), z.unknown()).default({}),

  /** Creation timestamp (ISO string) */
  createdAt: z.string(),

  /** Whether this has been read (for in-app) */
  read: z.boolean().default(false),

  /** Read timestamp (ISO string) */
  readAt: z.string().nullable().default(null),

  /** Action URL (link to relevant resource) */
  actionUrl: z.string().optional(),

  /** Group key for digest batching */
  groupKey: z.string().optional(),
});

export type Notification = z.infer<typeof NotificationSchema>;

// ---------------------------------------------------------------------------
// User Notification Preferences
// ---------------------------------------------------------------------------

export const ChannelPreferenceSchema = z.object({
  /** Whether the channel is enabled */
  enabled: z.boolean().default(true),

  /** Quiet hours start (HH:MM, null to disable) */
  quietStart: z.string().nullable().default(null),

  /** Quiet hours end (HH:MM, null to disable) */
  quietEnd: z.string().nullable().default(null),
});

export type ChannelPreference = z.infer<typeof ChannelPreferenceSchema>;

export const NotificationPreferencesSchema = z.object({
  /** User ID */
  userId: z.string().min(1),

  /** Global enabled/disabled */
  enabled: z.boolean().default(true),

  /** Per-channel preferences */
  channels: z
    .record(NotificationChannelSchema, ChannelPreferenceSchema)
    .default({}),

  /** Per-type preferences (which channels to use for each type) */
  typeOverrides: z
    .record(
      NotificationTypeSchema,
      z.object({
        enabled: z.boolean().default(true),
        channels: z.array(NotificationChannelSchema).optional(),
      }),
    )
    .default({}),

  /** Digest preference */
  digest: z
    .object({
      enabled: z.boolean().default(false),
      frequency: z.enum(["daily", "weekly"]).default("daily"),
      /** Time of day to send digest (HH:MM) */
      sendAt: z.string().default("09:00"),
    })
    .default({}),
});

export type NotificationPreferences = z.infer<
  typeof NotificationPreferencesSchema
>;

// ---------------------------------------------------------------------------
// Digest Config
// ---------------------------------------------------------------------------

export const DigestConfigSchema = z.object({
  /** Digest frequency */
  frequency: z.enum(["daily", "weekly"]),

  /** Time of day to send (HH:MM format) */
  sendAt: z.string().default("09:00"),

  /** Notification types to include in digest */
  includeTypes: z.array(NotificationTypeSchema).default([]),

  /** Maximum items per digest */
  maxItems: z.number().int().positive().default(50),

  /** Template name for the digest */
  template: z.string().default("daily-digest"),
});

export type DigestConfig = z.infer<typeof DigestConfigSchema>;

// ---------------------------------------------------------------------------
// Notification Template
// ---------------------------------------------------------------------------

export const NotificationTemplateSchema = z.object({
  /** Template name/identifier */
  name: z.string().min(1),

  /** Subject line (for email) */
  subject: z.string(),

  /** Markdown body template with {{variable}} placeholders */
  body: z.string(),

  /** Channels this template supports */
  channels: z.array(NotificationChannelSchema),
});

export type NotificationTemplate = z.infer<typeof NotificationTemplateSchema>;

// ---------------------------------------------------------------------------
// Dispatch Input
// ---------------------------------------------------------------------------

export interface DispatchInput {
  /** Notification event type */
  type: NotificationType;

  /** Recipient user ID */
  recipientId: string;

  /** Notification title */
  title: string;

  /** Notification body (Markdown) */
  body: string;

  /** Priority level */
  priority?: NotificationPriority;

  /** Target channels (overrides user preferences) */
  channels?: NotificationChannel[];

  /** Structured data payload */
  data?: Record<string, unknown>;

  /** Action URL */
  actionUrl?: string;

  /** Group key for digest batching */
  groupKey?: string;
}

// ---------------------------------------------------------------------------
// Dispatch Result
// ---------------------------------------------------------------------------

export interface DispatchResult {
  /** Notification ID */
  notificationId: string;

  /** Results per channel */
  channelResults: Record<
    NotificationChannel,
    {
      sent: boolean;
      error?: string;
      /** Whether it was batched for digest instead of sent immediately */
      batched?: boolean;
    }
  >;

  /** Whether the notification was suppressed by preferences */
  suppressed: boolean;
}

// ---------------------------------------------------------------------------
// Channel Sender Interface
// ---------------------------------------------------------------------------

export type ChannelSender = (
  notification: Notification,
) => Promise<{ sent: boolean; error?: string }>;

// ---------------------------------------------------------------------------
// Digest Entry
// ---------------------------------------------------------------------------

export interface DigestEntry {
  /** Notification ID */
  notificationId: string;

  /** Notification type */
  type: NotificationType;

  /** Notification title */
  title: string;

  /** Brief body excerpt */
  excerpt: string;

  /** Timestamp */
  createdAt: string;

  /** Action URL */
  actionUrl?: string;
}

// ---------------------------------------------------------------------------
// Storage Types (for in-app notifications)
// ---------------------------------------------------------------------------

export interface ListNotificationsOptions {
  /** User ID */
  userId: string;

  /** Filter by read status */
  read?: boolean;

  /** Filter by notification type */
  type?: NotificationType;

  /** Maximum number to return */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}
