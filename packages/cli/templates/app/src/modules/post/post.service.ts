import type { Post, CreatePostInput, UpdatePostInput } from "./post.types.js";

// ---------------------------------------------------------------------------
// PostService — Business Logic
// ---------------------------------------------------------------------------

// TODO: Replace in-memory store with database queries
const posts: Map<string, Post> = new Map();

export const PostService = {
  async findAll(): Promise<Post[]> {
    return Array.from(posts.values());
  },

  async findById(id: string): Promise<Post | null> {
    return posts.get(id) ?? null;
  },

  async findByAuthor(authorId: string): Promise<Post[]> {
    return Array.from(posts.values()).filter((p) => p.authorId === authorId);
  },

  async create(authorId: string, data: CreatePostInput): Promise<Post> {
    const id = crypto.randomUUID();
    const now = new Date();
    const post: Post = {
      id,
      title: data.title,
      body: data.body,
      published: data.published ?? false,
      authorId,
      createdAt: now,
      updatedAt: now,
    };
    posts.set(id, post);
    return post;
  },

  async update(id: string, data: UpdatePostInput): Promise<Post | null> {
    const post = posts.get(id);
    if (!post) return null;

    const updated = { ...post, ...data, updatedAt: new Date() };
    posts.set(id, updated);
    return updated;
  },

  async remove(id: string): Promise<boolean> {
    return posts.delete(id);
  },
};
