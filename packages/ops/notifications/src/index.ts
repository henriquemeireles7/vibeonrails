/**
 * @vibeonrails/notifications
 *
 * Multi-channel notification system with email, in-app, push, and Discord.
 * User preferences, digest batching, and Markdown templates.
 */

// Types
export type {
  NotificationChannel,
  NotificationType,
  NotificationPriority,
  Notification,
  ChannelPreference,
  NotificationPreferences,
  DigestConfig,
  NotificationTemplate,
  DispatchInput,
  DispatchResult,
  ChannelSender,
  DigestEntry,
  ListNotificationsOptions,
} from "./types.js";

export {
  NotificationChannelSchema,
  NotificationTypeSchema,
  NotificationPrioritySchema,
  NotificationSchema,
  ChannelPreferenceSchema,
  NotificationPreferencesSchema,
  DigestConfigSchema,
  NotificationTemplateSchema,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_TYPES,
} from "./types.js";

// Dispatcher
export {
  createDispatcher,
  shouldNotify,
  shouldBatchForDigest,
  renderTemplate,
  formatForChannel,
  resetDispatcherState,
} from "./dispatcher.js";

export type { DispatcherConfig, Dispatcher } from "./dispatcher.js";

// Storage (Drizzle schema + in-memory store)
export {
  notifications,
  notificationPreferences,
  notificationDigestQueue,
  createNotificationStore,
} from "./storage.js";

export type {
  NotificationRow,
  NewNotificationRow,
  NotificationPreferencesRow,
  NewNotificationPreferencesRow,
  DigestQueueRow,
  NewDigestQueueRow,
} from "./storage.js";
