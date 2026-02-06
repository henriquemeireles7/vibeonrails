import { describe, it, expect } from "vitest";
import { createUserRepository } from "./user.repository.js";

describe("createUserRepository", () => {
  it("is a function", () => {
    expect(typeof createUserRepository).toBe("function");
  });

  it("returns an object with CRUD methods", () => {
    const fakeDb = {} as never;
    const repo = createUserRepository(fakeDb);
    expect(typeof repo.findById).toBe("function");
    expect(typeof repo.findByEmail).toBe("function");
    expect(typeof repo.create).toBe("function");
    expect(typeof repo.update).toBe("function");
    expect(typeof repo.list).toBe("function");
  });
});
