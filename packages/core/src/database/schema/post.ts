/**
 * Post Schema
 *
 * Defines the posts table. Posts belong to users via authorId.
 * Table: posts
 */

import { pgTable, uuid, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './user.js';

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  published: boolean('published').notNull().default(false),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
