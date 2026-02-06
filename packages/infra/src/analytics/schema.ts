/**
 * Analytics Database Schema
 *
 * Drizzle schema for the analytics_events table.
 * Stores event data in Postgres with JSONB properties.
 */

import { pgTable, text, timestamp, jsonb, serial, index } from 'drizzle-orm/pg-core';

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    properties: jsonb('properties')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    sessionId: text('session_id'),
    pageUrl: text('page_url'),
    referrer: text('referrer'),
    userAgent: text('user_agent'),
    userId: text('user_id'),
    timestamp: timestamp('timestamp', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index('idx_analytics_name').on(table.name),
    timestampIdx: index('idx_analytics_timestamp').on(table.timestamp),
    userIdIdx: index('idx_analytics_user_id').on(table.userId),
    sessionIdIdx: index('idx_analytics_session_id').on(table.sessionId),
  }),
);
