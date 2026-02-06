/**
 * API Key Database Schema
 *
 * Drizzle schema for the api_keys table.
 * Keys are hashed in the database (never stored in plain text).
 */

import { pgTable, text, integer, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const apiKeys = pgTable('api_keys', {
  /** Unique identifier */
  id: text('id').primaryKey(),

  /** Display name for the key */
  name: text('name').notNull(),

  /** Key prefix for identification (e.g., "vor_live_abc1") */
  prefix: text('prefix').notNull(),

  /** SHA-256 hash of the full key */
  keyHash: text('key_hash').notNull().unique(),

  /** Environment: live or test */
  environment: text('environment').notNull().default('live'),

  /** Owner ID (user or organization) */
  ownerId: text('owner_id').notNull(),

  /** Rate limit (requests per minute). null = unlimited */
  rateLimit: integer('rate_limit'),

  /** Number of times the key has been used */
  usageCount: integer('usage_count').notNull().default(0),

  /** When the key was last used */
  lastUsedAt: timestamp('last_used_at', { mode: 'date' }),

  /** When the key expires (null = never) */
  expiresAt: timestamp('expires_at', { mode: 'date' }),

  /** When the key was revoked (null = active) */
  revokedAt: timestamp('revoked_at', { mode: 'date' }),

  /** Permitted scopes/permissions */
  scopes: jsonb('scopes').$type<string[]>().notNull().default([]),

  /** Additional metadata */
  metadata: jsonb('metadata')
    .$type<Record<string, unknown>>()
    .notNull()
    .default({}),

  /** When the key was created */
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
});
