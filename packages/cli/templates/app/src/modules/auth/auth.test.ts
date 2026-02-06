import { describe, it, expect } from "vitest";
import { AuthService } from "./auth.service.js";

describe("AuthService", () => {
  const testUser = {
    email: "test@example.com",
    password: "password123",
    name: "Test User",
  };

  describe("register", () => {
    it("returns tokens for a new user", async () => {
      const result = await AuthService.register({
        ...testUser,
        email: `register-${Date.now()}@example.com`,
      });

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(typeof result.accessToken).toBe("string");
      expect(typeof result.refreshToken).toBe("string");
    });

    it("rejects duplicate email", async () => {
      const email = `dup-${Date.now()}@example.com`;
      await AuthService.register({ ...testUser, email });

      await expect(
        AuthService.register({ ...testUser, email }),
      ).rejects.toThrow("already exists");
    });
  });

  describe("login", () => {
    it("returns tokens for valid credentials", async () => {
      const email = `login-${Date.now()}@example.com`;
      await AuthService.register({ ...testUser, email });

      const result = await AuthService.login({
        email,
        password: testUser.password,
      });

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
    });

    it("rejects invalid password", async () => {
      const email = `bad-pwd-${Date.now()}@example.com`;
      await AuthService.register({ ...testUser, email });

      await expect(
        AuthService.login({ email, password: "wrong-password" }),
      ).rejects.toThrow("Invalid email or password");
    });

    it("rejects unknown email", async () => {
      await expect(
        AuthService.login({ email: "nobody@example.com", password: "anything" }),
      ).rejects.toThrow("Invalid email or password");
    });
  });
});
