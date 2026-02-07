/**
 * Auth Flow Integration Test
 *
 * Verifies the auth module components work together:
 * JWT sign/verify, session create/validate/revoke, password hash/verify.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("Auth Flow Integration", () => {
  describe("JWT token cycle", () => {
    beforeEach(() => {
      vi.stubEnv("JWT_SECRET", "test-secret-that-is-at-least-32-chars-long!!");
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("signs and verifies an access token", async () => {
      const { signAccessToken, verifyToken } = await import(
        "../security/auth/jwt.js"
      );

      const token = await signAccessToken(
        { id: "user-1", email: "test@example.com", role: "user" },
        "15m",
      );

      expect(typeof token).toBe("string");
      expect(token.split(".")).toHaveLength(3);

      const payload = await verifyToken(token);

      expect(payload.sub).toBe("user-1");
      expect(payload.email).toBe("test@example.com");
      expect(payload.role).toBe("user");
    });
  });

  describe("Session lifecycle", () => {
    it("creates, validates, and revokes a session", async () => {
      const { createMemorySessionStore, createSessionManager } = await import(
        "../security/auth/sessions.js"
      );

      const store = createMemorySessionStore();
      const sessions = createSessionManager(store);

      // Create session
      const sessionId = await sessions.create("user-1", "admin");
      expect(typeof sessionId).toBe("string");
      expect(sessionId.length).toBeGreaterThan(0);

      // Validate session
      const data = await sessions.validate(sessionId);
      expect(data).not.toBeNull();
      expect(data!.userId).toBe("user-1");
      expect(data!.role).toBe("admin");

      // Revoke session
      await sessions.revoke(sessionId);
      const revoked = await sessions.validate(sessionId);
      expect(revoked).toBeNull();
    });
  });

  describe("Password hashing", () => {
    it("hashes and verifies a password", { timeout: 30_000 }, async () => {
      const { hashPassword, verifyPassword } = await import(
        "../security/auth/password.js"
      );

      const hashed = await hashPassword("my-secure-password-123");
      expect(typeof hashed).toBe("string");
      expect(hashed).not.toBe("my-secure-password-123");

      // verifyPassword(hashedPassword, plaintext)
      const valid = await verifyPassword(hashed, "my-secure-password-123");
      expect(valid).toBe(true);

      const invalid = await verifyPassword(hashed, "wrong-password");
      expect(invalid).toBe(false);
    });
  });

  describe("Auth messages prevent enumeration", () => {
    it("uses identical messages for login and not-found", async () => {
      const { AUTH_MESSAGES } = await import(
        "../security/auth/auth-messages.js"
      );

      // Login failure and account-not-found must use the same message
      expect(AUTH_MESSAGES.INVALID_CREDENTIALS).toBe(AUTH_MESSAGES.ACCOUNT_NOT_FOUND);
    });
  });
});
