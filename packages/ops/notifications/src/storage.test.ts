/**
 * Notifications — Storage Tests
 *
 * Tests for in-memory notification storage CRUD operations.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createNotificationStore } from "./storage.js";
import type { Notification } from "./types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeNotification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: `notif_${Date.now()}_${Math.random()}`,
    type: "ticket_created",
    recipientId: "user_1",
    title: "Test Notification",
    body: "This is a test notification",
    priority: "normal",
    channels: ["in-app"],
    data: {},
    createdAt: new Date().toISOString(),
    read: false,
    readAt: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createNotificationStore", () => {
  let store: ReturnType<typeof createNotificationStore>;

  beforeEach(() => {
    store = createNotificationStore();
    store.clear();
  });

  describe("save", () => {
    it("should save a notification", () => {
      const notification = makeNotification();
      const saved = store.save(notification);

      expect(saved.id).toBe(notification.id);
      expect(saved.title).toBe("Test Notification");
      expect(saved.read).toBe(false);
    });

    it("should generate ID if not provided", () => {
      const notification = makeNotification({ id: "" });
      const saved = store.save(notification);

      expect(saved.id).toMatch(/^notif_/);
    });
  });

  describe("list", () => {
    it("should list notifications for a user", () => {
      store.save(makeNotification({ recipientId: "user_1" }));
      store.save(makeNotification({ recipientId: "user_1" }));
      store.save(makeNotification({ recipientId: "user_2" }));

      const results = store.list({ userId: "user_1" });
      expect(results).toHaveLength(2);
    });

    it("should filter by read status", () => {
      const n1 = store.save(makeNotification());
      store.save(makeNotification());
      store.markAsRead(n1.id);

      const unread = store.list({ userId: "user_1", read: false });
      expect(unread).toHaveLength(1);

      const read = store.list({ userId: "user_1", read: true });
      expect(read).toHaveLength(1);
    });

    it("should filter by notification type", () => {
      store.save(makeNotification({ type: "ticket_created" }));
      store.save(makeNotification({ type: "deploy_success" }));

      const results = store.list({
        userId: "user_1",
        type: "ticket_created",
      });
      expect(results).toHaveLength(1);
    });

    it("should support pagination with limit and offset", () => {
      for (let i = 0; i < 10; i++) {
        store.save(
          makeNotification({
            id: `notif_${i}`,
            createdAt: new Date(Date.now() + i * 1000).toISOString(),
          }),
        );
      }

      const page1 = store.list({ userId: "user_1", limit: 3, offset: 0 });
      expect(page1).toHaveLength(3);

      const page2 = store.list({ userId: "user_1", limit: 3, offset: 3 });
      expect(page2).toHaveLength(3);

      const page4 = store.list({ userId: "user_1", limit: 3, offset: 9 });
      expect(page4).toHaveLength(1);
    });

    it("should sort by createdAt descending", () => {
      store.save(
        makeNotification({
          id: "old",
          createdAt: new Date("2024-01-01").toISOString(),
        }),
      );
      store.save(
        makeNotification({
          id: "new",
          createdAt: new Date("2024-12-01").toISOString(),
        }),
      );

      const results = store.list({ userId: "user_1" });
      expect(results[0].id).toBe("new");
      expect(results[1].id).toBe("old");
    });
  });

  describe("markAsRead", () => {
    it("should mark a notification as read", () => {
      const notification = store.save(makeNotification());
      const success = store.markAsRead(notification.id);

      expect(success).toBe(true);

      const readNotifs = store.list({ userId: "user_1", read: true });
      expect(readNotifs).toHaveLength(1);
      expect(readNotifs[0].readAt).toBeTruthy();
    });

    it("should return false for nonexistent notification", () => {
      expect(store.markAsRead("nonexistent")).toBe(false);
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all notifications for a user as read", () => {
      store.save(makeNotification({ recipientId: "user_1" }));
      store.save(makeNotification({ recipientId: "user_1" }));
      store.save(makeNotification({ recipientId: "user_2" }));

      const count = store.markAllAsRead("user_1");
      expect(count).toBe(2);

      const unread = store.list({ userId: "user_1", read: false });
      expect(unread).toHaveLength(0);

      // user_2 should still have unread
      const user2Unread = store.list({ userId: "user_2", read: false });
      expect(user2Unread).toHaveLength(1);
    });
  });

  describe("unreadCount", () => {
    it("should return unread count for a user", () => {
      store.save(makeNotification({ recipientId: "user_1" }));
      store.save(makeNotification({ recipientId: "user_1" }));
      const n3 = store.save(makeNotification({ recipientId: "user_1" }));
      store.markAsRead(n3.id);

      expect(store.unreadCount("user_1")).toBe(2);
    });

    it("should return 0 for user with no notifications", () => {
      expect(store.unreadCount("unknown")).toBe(0);
    });
  });

  describe("delete", () => {
    it("should delete a notification", () => {
      const notification = store.save(makeNotification());
      const deleted = store.delete(notification.id);

      expect(deleted).toBe(true);

      const results = store.list({ userId: "user_1" });
      expect(results).toHaveLength(0);
    });

    it("should return false for nonexistent notification", () => {
      expect(store.delete("nonexistent")).toBe(false);
    });
  });

  describe("clear", () => {
    it("should clear all notifications", () => {
      store.save(makeNotification());
      store.save(makeNotification());
      store.clear();

      const results = store.list({ userId: "user_1" });
      expect(results).toHaveLength(0);
    });
  });
});
