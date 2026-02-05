/**
 * Schema Relations
 *
 * Defines relationships between tables for Drizzle's relational queries.
 */

import { relations } from 'drizzle-orm';
import { users } from './user.js';
import { posts } from './post.js';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
