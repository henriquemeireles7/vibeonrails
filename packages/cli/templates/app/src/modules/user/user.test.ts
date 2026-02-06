import { describe, it, expect } from "vitest";
import { UserService } from "./user.service.js";

describe("UserService", () => {
  describe("findAll", () => {
    it("returns an array", async () => {
      const result = await UserService.findAll();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("findById", () => {
    it("returns null for unknown id", async () => {
      const result = await UserService.findById("non-existent-id");
      expect(result).toBeNull();
    });
  });

  describe("findByEmail", () => {
    it("returns null for unknown email", async () => {
      const result = await UserService.findByEmail("nobody@test.com");
      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("returns null for unknown id", async () => {
      const result = await UserService.update("non-existent-id", { name: "New Name" });
      expect(result).toBeNull();
    });
  });
});
