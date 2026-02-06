import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { posts, type Post, type NewPost } from "../schema/post.js";

/**
 * Post repository — CRUD queries for the posts table.
 */
export function createPostRepository(db: Database) {
  return {
    async findAll(): Promise<Post[]> {
      return db.select().from(posts);
    },

    async findById(id: string): Promise<Post | undefined> {
      const result = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
      return result[0];
    },

    async findByAuthor(authorId: string): Promise<Post[]> {
      return db.select().from(posts).where(eq(posts.authorId, authorId));
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
      const result = await db.delete(posts).where(eq(posts.id, id)).returning();
      return result.length > 0;
    },
  };
}

export type PostRepository = ReturnType<typeof createPostRepository>;
