/**
 * Support Chat — Database Schema
 *
 * Drizzle ORM schema for chat_sessions and chat_messages tables.
 * These tables store chat history for context continuity across sessions.
 *
 * Tables:
 * - chat_sessions: Session metadata and status tracking
 * - chat_messages: Individual messages within sessions
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  uuid,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Chat Sessions Table
// ---------------------------------------------------------------------------

export const chatSessions = pgTable("chat_sessions", {
  /** Unique session identifier */
  id: uuid("id").primaryKey().defaultRandom(),

  /** User ID (null for anonymous sessions) */
  userId: text("user_id"),

  /** Session status: active, escalated, resolved, expired */
  status: varchar("status", { length: 20 }).notNull().default("active"),

  /** Number of messages in the session */
  messageCount: integer("message_count").notNull().default(0),

  /** Session metadata (JSON) */
  metadata: jsonb("metadata")
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),

  /** Session creation timestamp */
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  /** Last activity timestamp */
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  /** Session expiry timestamp */
  expiresAt: timestamp("expires_at", { withTimezone: true }),
});

export type ChatSessionRow = typeof chatSessions.$inferSelect;
export type NewChatSessionRow = typeof chatSessions.$inferInsert;

// ---------------------------------------------------------------------------
// Chat Messages Table
// ---------------------------------------------------------------------------

export const chatMessages = pgTable("chat_messages", {
  /** Unique message identifier */
  id: uuid("id").primaryKey().defaultRandom(),

  /** Session this message belongs to */
  sessionId: uuid("session_id")
    .references(() => chatSessions.id)
    .notNull(),

  /** Message role: user, assistant, system */
  role: varchar("role", { length: 20 }).notNull(),

  /** Message content (plain text) */
  content: text("content").notNull(),

  /** Message creation timestamp */
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type NewChatMessageRow = typeof chatMessages.$inferInsert;

// ---------------------------------------------------------------------------
// Escalation Tickets Table
// ---------------------------------------------------------------------------

export const escalationTickets = pgTable("escalation_tickets", {
  /** Unique ticket identifier */
  id: uuid("id").primaryKey().defaultRandom(),

  /** Chat session that triggered the escalation */
  sessionId: uuid("session_id")
    .references(() => chatSessions.id)
    .notNull(),

  /** Escalation reason */
  reason: varchar("reason", { length: 50 }).notNull(),

  /** AI-generated conversation summary */
  summary: text("summary").notNull(),

  /** User ID if available */
  userId: text("user_id"),

  /** Ticket priority */
  priority: varchar("priority", { length: 20 }).notNull().default("medium"),

  /** Ticket status */
  status: varchar("status", { length: 20 }).notNull().default("open"),

  /** Whether this ticket has been read by support */
  read: boolean("read").notNull().default(false),

  /** Ticket creation timestamp */
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  /** Last update timestamp */
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EscalationTicketRow = typeof escalationTickets.$inferSelect;
export type NewEscalationTicketRow = typeof escalationTickets.$inferInsert;
