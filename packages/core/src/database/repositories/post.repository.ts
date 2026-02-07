import { eq, and, isNull } from "drizzle-orm";
import type { Database } from "../client.js";
import { posts, type Post, type NewPost } from "../schema/post.js";
import {
  type PaginationOptions,
  type OffsetPaginatedResult,
  clampPagination,
  paginatedResult,
} from "../pagination.js";

/**
 * Post repository — CRUD queries for the posts table.
 *
 * All list methods enforce server-side pagination with a max page size cap.
 * Soft-deleted posts are excluded from list queries by default.
 * The `remove` method performs a soft delete (sets `deletedAt`).
 */
export function createPostRepository(db: Database) {
  return {
    async findAll(options?: PaginationOptions): Promise<OffsetPaginatedResult<Post>> {
      const { limit, offset } = clampPagination(options);
      const rows = await db
        .select()
        .from(posts)
        .where(isNull(posts.deletedAt))
        .limit(limit + 1)
        .offset(offset);
      return paginatedResult(rows, limit, offset);
    },

    async findById(id: string): Promise<Post | undefined> {
      const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
      return result[0];
    },

    async findByAuthor(authorId: string, options?: PaginationOptions): Promise<OffsetPaginatedResult<Post>> {
      const { limit, offset } = clampPagination(options);
      const rows = await db
        .select()
        .from(posts)
        .where(and(eq(posts.authorId, authorId), isNull(posts.deletedAt)))
        .limit(limit + 1)
        .offset(offset);
      return paginatedResult(rows, limit, offset);
    },

    async create(data: NewPost): Promise<Post> {
      const result = await db.insert(posts).values(data).returning();
      return result[0]!;
    },

    async update(id: string, data: Partial<Omit<NewPost, "id">>): Promise<Post | undefined> {
      const result = await db
        .update(posts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(posts.id, id))
        .returning();
      return result[0];
    },

    async remove(id: string): Promise<boolean> {
      const result = await db
        .update(posts)
        .set({ deletedAt: new Date() })
        .where(eq(posts.id, id))
        .returning();
      return result.length > 0;
    },
  };
}

export type PostRepository = ReturnType<typeof createPostRepository>;
