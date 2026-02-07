/**
 * User Schema
 *
 * Defines the users table. This is the source of truth for user data.
 * Table: users
 *
 * Indexes:
 *   - email: unique (implicit from .unique() constraint, used in login/lookup)
 *   - role: authorization queries filter by role
 *   - created_at: ordering and date-range filtering
 */

import { pgTable, uuid, varchar, timestamp, boolean, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull().default('user'),
  emailVerified: boolean('email_verified').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  roleIdx: index('users_role_idx').on(table.role),
  createdAtIdx: index('users_created_at_idx').on(table.createdAt),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
