import { describe, it, expect } from "vitest";
import { PostService } from "./post.service.js";

describe("PostService", () => {
  const authorId = "00000000-0000-0000-0000-000000000001";

  describe("findAll", () => {
    it("returns an array", async () => {
      const result = await PostService.findAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("findById", () => {
    it("returns null for unknown id", async () => {
      const result = await PostService.findById("non-existent-id");
      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("creates a post with the given author", async () => {
      const post = await PostService.create(authorId, {
        title: "Test Post",
        body: "Hello, world!",
      });

      expect(post).toHaveProperty("id");
      expect(post.title).toBe("Test Post");
      expect(post.body).toBe("Hello, world!");
      expect(post.authorId).toBe(authorId);
      expect(post.published).toBe(false);
    });
  });

  describe("update", () => {
    it("updates an existing post", async () => {
      const post = await PostService.create(authorId, {
        title: "Original",
        body: "Content",
      });

      const updated = await PostService.update(post.id, { title: "Updated" });
      expect(updated?.title).toBe("Updated");
      expect(updated?.body).toBe("Content");
    });

    it("returns null for unknown id", async () => {
      const result = await PostService.update("non-existent-id", { title: "Nope" });
      expect(result).toBeNull();
    });
  });

  describe("remove", () => {
    it("removes an existing post", async () => {
      const post = await PostService.create(authorId, {
        title: "To Delete",
        body: "Content",
      });

      const removed = await PostService.remove(post.id);
      expect(removed).toBe(true);

      const found = await PostService.findById(post.id);
      expect(found).toBeNull();
    });

    it("returns false for unknown id", async () => {
      const result = await PostService.remove("non-existent-id");
      expect(result).toBe(false);
    });
  });
});
