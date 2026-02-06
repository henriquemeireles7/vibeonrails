/**
 * Notifications — Storage
 *
 * Drizzle ORM schema for in-app notifications table.
 * Provides CRUD operations: create, list, mark as read, list unread.
 *
 * Usage:
 *   import { notifications, createNotificationStore } from '@vibeonrails/notifications';
 */

import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  uuid,
  varchar,
  integer,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Notifications Table
// ---------------------------------------------------------------------------

export const notifications = pgTable("notifications", {
  /** Unique notification identifier */
  id: uuid("id").primaryKey().defaultRandom(),

  /** Notification event type */
  type: varchar("type", { length: 50 }).notNull(),

  /** Recipient user ID */
  recipientId: text("recipient_id").notNull(),

  /** Notification title */
  title: text("title").notNull(),

  /** Notification body (Markdown) */
  body: text("body").notNull(),

  /** Priority: low, normal, high, urgent */
  priority: varchar("priority", { length: 20 }).notNull().default("normal"),

  /** Whether the notification has been read */
  read: boolean("read").notNull().default(false),

  /** Timestamp when the notification was read */
  readAt: timestamp("read_at", { withTimezone: true }),

  /** Action URL for the notification */
  actionUrl: text("action_url"),

  /** Group key for digest batching */
  groupKey: text("group_key"),

  /** Structured data payload */
  data: jsonb("data").$type<Record<string, unknown>>().notNull().default({}),

  /** Creation timestamp */
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;

// ---------------------------------------------------------------------------
// User Notification Preferences Table
// ---------------------------------------------------------------------------

export const notificationPreferences = pgTable("notification_preferences", {
  /** User ID (primary key) */
  userId: text("user_id").primaryKey(),

  /** Global enabled/disabled */
  enabled: boolean("enabled").notNull().default(true),

  /** Per-channel preferences (JSON) */
  channels: jsonb("channels")
    .$type<
      Record<
        string,
        {
          enabled: boolean;
          quietStart?: string | null;
          quietEnd?: string | null;
        }
      >
    >()
    .notNull()
    .default({}),

  /** Per-type overrides (JSON) */
  typeOverrides: jsonb("type_overrides")
    .$type<Record<string, { enabled: boolean; channels?: string[] }>>()
    .notNull()
    .default({}),

  /** Digest preferences (JSON) */
  digest: jsonb("digest")
    .$type<{ enabled: boolean; frequency: string; sendAt: string }>()
    .notNull()
    .default({ enabled: false, frequency: "daily", sendAt: "09:00" }),

  /** Last updated timestamp */
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type NotificationPreferencesRow =
  typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferencesRow =
  typeof notificationPreferences.$inferInsert;

// ---------------------------------------------------------------------------
// Notification Digest Queue Table
// ---------------------------------------------------------------------------

export const notificationDigestQueue = pgTable("notification_digest_queue", {
  /** Unique entry identifier */
  id: uuid("id").primaryKey().defaultRandom(),

  /** Recipient user ID */
  recipientId: text("recipient_id").notNull(),

  /** Reference to the notification */
  notificationId: uuid("notification_id")
    .references(() => notifications.id)
    .notNull(),

  /** Whether this entry has been processed into a digest */
  processed: boolean("processed").notNull().default(false),

  /** Batch number for the digest */
  batchNumber: integer("batch_number"),

  /** Creation timestamp */
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DigestQueueRow = typeof notificationDigestQueue.$inferSelect;
export type NewDigestQueueRow = typeof notificationDigestQueue.$inferInsert;

// ---------------------------------------------------------------------------
// In-Memory Store (for usage without database)
// ---------------------------------------------------------------------------

import type { ListNotificationsOptions, Notification } from "./types.js";

interface StoredNotification {
  id: string;
  type: string;
  recipientId: string;
  title: string;
  body: string;
  priority: string;
  read: boolean;
  readAt: string | null;
  actionUrl?: string;
  data: Record<string, unknown>;
  createdAt: string;
}

const store = new Map<string, StoredNotification>();

let storeIdCounter = 0;

function generateStoreId(): string {
  storeIdCounter += 1;
  return `notif_${Date.now()}_${storeIdCounter}`;
}

/**
 * Create a simple in-memory notification store.
 * Use this when you don't have a database connection.
 */
export function createNotificationStore() {
  return {
    /**
     * Store a notification.
     */
    save(notification: Notification): StoredNotification {
      const stored: StoredNotification = {
        id: notification.id || generateStoreId(),
        type: notification.type,
        recipientId: notification.recipientId,
        title: notification.title,
        body: notification.body,
        priority: notification.priority,
        read: false,
        readAt: null,
        actionUrl: notification.actionUrl,
        data: notification.data,
        createdAt: notification.createdAt,
      };
      store.set(stored.id, stored);
      return stored;
    },

    /**
     * List notifications for a user with filters.
     */
    list(options: ListNotificationsOptions): StoredNotification[] {
      let results = Array.from(store.values()).filter(
        (n) => n.recipientId === options.userId,
      );

      if (options.read !== undefined) {
        results = results.filter((n) => n.read === options.read);
      }

      if (options.type) {
        results = results.filter((n) => n.type === options.type);
      }

      // Sort by createdAt descending
      results.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      const offset = options.offset ?? 0;
      const limit = options.limit ?? 50;

      return results.slice(offset, offset + limit);
    },

    /**
     * Mark a notification as read.
     */
    markAsRead(notificationId: string): boolean {
      const notification = store.get(notificationId);
      if (!notification) return false;

      notification.read = true;
      notification.readAt = new Date().toISOString();
      return true;
    },

    /**
     * Mark all notifications for a user as read.
     */
    markAllAsRead(userId: string): number {
      let count = 0;
      for (const notification of store.values()) {
        if (notification.recipientId === userId && !notification.read) {
          notification.read = true;
          notification.readAt = new Date().toISOString();
          count += 1;
        }
      }
      return count;
    },

    /**
     * Get unread count for a user.
     */
    unreadCount(userId: string): number {
      let count = 0;
      for (const notification of store.values()) {
        if (notification.recipientId === userId && !notification.read) {
          count += 1;
        }
      }
      return count;
    },

    /**
     * Delete a notification.
     */
    delete(notificationId: string): boolean {
      return store.delete(notificationId);
    },

    /**
     * Clear all stored notifications. For testing.
     */
    clear(): void {
      store.clear();
      storeIdCounter = 0;
    },
  };
}
