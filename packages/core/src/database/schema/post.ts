/**
 * Post Schema
 *
 * Defines the posts table. Posts belong to users via authorId.
 * Table: posts
 *
 * Indexes:
 *   - author_id: findByAuthor queries, JOIN with users
 *   - published + created_at: listing published posts ordered by date
 *   - created_at: ordering and date-range filtering
 */

import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './user.js';

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  published: boolean('published').notNull().default(false),
  authorId: uuid('author_id').references(() => users.id).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  authorIdIdx: index('posts_author_id_idx').on(table.authorId),
  publishedCreatedAtIdx: index('posts_published_created_at_idx').on(table.published, table.createdAt),
  createdAtIdx: index('posts_created_at_idx').on(table.createdAt),
}));

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
