import { describe, it, expect } from "vitest";
import { createPostRepository } from "./post.repository.js";

describe("createPostRepository", () => {
  it("is a function", () => {
    expect(typeof createPostRepository).toBe("function");
  });

  it("returns an object with CRUD methods", () => {
    const fakeDb = {} as never;
    const repo = createPostRepository(fakeDb);
    expect(typeof repo.findAll).toBe("function");
    expect(typeof repo.findById).toBe("function");
    expect(typeof repo.findByAuthor).toBe("function");
    expect(typeof repo.create).toBe("function");
    expect(typeof repo.update).toBe("function");
    expect(typeof repo.remove).toBe("function");
  });
});
