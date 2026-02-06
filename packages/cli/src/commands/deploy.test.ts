import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectPlatform,
  validateEnvironment,
  isDestructiveMigration,
  healthCheck,
  getDeployCommand,
  getPlatformDisplayName,
} from "./deploy.js";

describe("Deploy Command", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // -----------------------------------------------------------------------
  // Platform Detection
  // -----------------------------------------------------------------------

  describe("detectPlatform", () => {
    it("should detect Railway from RAILWAY_TOKEN", () => {
      const platform = detectPlatform({
        env: { RAILWAY_TOKEN: "tok_abc" },
      });
      expect(platform).toBe("railway");
    });

    it("should detect Fly.io from FLY_ACCESS_TOKEN", () => {
      const platform = detectPlatform({
        env: { FLY_ACCESS_TOKEN: "fly_abc" },
      });
      expect(platform).toBe("fly");
    });

    it("should detect Docker from Dockerfile", () => {
      const platform = detectPlatform({
        env: {},
        hasDockerfile: true,
      });
      expect(platform).toBe("docker");
    });

    it("should return unknown when no platform detected", () => {
      const platform = detectPlatform({ env: {} });
      expect(platform).toBe("unknown");
    });

    it("should prefer Railway over Fly.io when both are set", () => {
      const platform = detectPlatform({
        env: { RAILWAY_TOKEN: "tok", FLY_ACCESS_TOKEN: "fly" },
      });
      expect(platform).toBe("railway");
    });

    it("should prefer env token over Dockerfile", () => {
      const platform = detectPlatform({
        env: { FLY_ACCESS_TOKEN: "fly" },
        hasDockerfile: true,
      });
      expect(platform).toBe("fly");
    });
  });

  // -----------------------------------------------------------------------
  // Environment Validation
  // -----------------------------------------------------------------------

  describe("validateEnvironment", () => {
    it("should validate required env vars for Railway", () => {
      const result = validateEnvironment("railway", {
        DATABASE_URL: "postgres://...",
        JWT_SECRET: "supersecret123456789012345678901234",
        RAILWAY_TOKEN: "tok",
      });

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it("should report missing env vars", () => {
      const result = validateEnvironment("railway", {});

      expect(result.valid).toBe(false);
      expect(result.missing).toContain("DATABASE_URL");
      expect(result.missing).toContain("JWT_SECRET");
      expect(result.missing).toContain("RAILWAY_TOKEN");
    });

    it("should validate Fly.io specific vars", () => {
      const result = validateEnvironment("fly", {
        DATABASE_URL: "postgres://...",
        JWT_SECRET: "secret",
      });

      expect(result.valid).toBe(false);
      expect(result.missing).toContain("FLY_ACCESS_TOKEN");
    });

    it("should not require platform-specific vars for docker", () => {
      const result = validateEnvironment("docker", {
        DATABASE_URL: "postgres://...",
        JWT_SECRET: "secret",
      });

      expect(result.valid).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Migration Safety
  // -----------------------------------------------------------------------

  describe("isDestructiveMigration", () => {
    it("should detect DROP TABLE as destructive", () => {
      expect(isDestructiveMigration("DROP TABLE users;")).toBe(true);
    });

    it("should detect DROP COLUMN as destructive", () => {
      expect(
        isDestructiveMigration("ALTER TABLE users DROP COLUMN email;"),
      ).toBe(true);
    });

    it("should detect RENAME as destructive", () => {
      expect(
        isDestructiveMigration("ALTER TABLE users RENAME TO people;"),
      ).toBe(true);
    });

    it("should detect TRUNCATE as destructive", () => {
      expect(isDestructiveMigration("TRUNCATE TABLE logs;")).toBe(true);
    });

    it("should detect DELETE FROM as destructive", () => {
      expect(
        isDestructiveMigration("DELETE FROM users WHERE active = false;"),
      ).toBe(true);
    });

    it("should not flag additive operations", () => {
      expect(
        isDestructiveMigration("ALTER TABLE users ADD COLUMN bio TEXT;"),
      ).toBe(false);
      expect(isDestructiveMigration("CREATE TABLE posts (id SERIAL);")).toBe(
        false,
      );
      expect(
        isDestructiveMigration(
          "CREATE INDEX idx_users_email ON users (email);",
        ),
      ).toBe(false);
    });

    it("should be case-insensitive", () => {
      expect(isDestructiveMigration("drop table users;")).toBe(true);
      expect(isDestructiveMigration("Drop Table Users;")).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Health Check
  // -----------------------------------------------------------------------

  describe("healthCheck", () => {
    it("should return healthy on 200 response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 200 });

      const result = await healthCheck(
        "http://localhost:3000/health",
        5,
        mockFetch,
      );

      expect(result.healthy).toBe(true);
      expect(result.attempts).toBe(1);
    });

    it("should retry on non-200 responses", async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 3) return { status: 503 };
        return { status: 200 };
      });

      const result = await healthCheck(
        "http://localhost:3000/health",
        30,
        mockFetch,
      );

      expect(result.healthy).toBe(true);
      expect(result.attempts).toBe(3);
    });

    it("should retry on fetch errors", async () => {
      let callCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount < 2) throw new Error("Connection refused");
        return { status: 200 };
      });

      const result = await healthCheck(
        "http://localhost:3000/health",
        30,
        mockFetch,
      );

      expect(result.healthy).toBe(true);
      expect(result.attempts).toBe(2);
    });

    it("should timeout and return unhealthy", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ status: 503 });

      const result = await healthCheck(
        "http://localhost:3000/health",
        1,
        mockFetch,
      );

      expect(result.healthy).toBe(false);
      expect(result.attempts).toBeGreaterThanOrEqual(1);
    });
  });

  // -----------------------------------------------------------------------
  // Deploy Command
  // -----------------------------------------------------------------------

  describe("getDeployCommand", () => {
    it("should return correct command for Railway", () => {
      expect(getDeployCommand("railway")).toBe("railway up");
    });

    it("should return correct command for Fly.io", () => {
      expect(getDeployCommand("fly")).toBe("fly deploy");
    });

    it("should return correct command for Docker", () => {
      expect(getDeployCommand("docker")).toBe("docker build -t app .");
    });

    it("should return null for unknown platform", () => {
      expect(getDeployCommand("unknown")).toBeNull();
    });
  });

  describe("getPlatformDisplayName", () => {
    it("should return display names", () => {
      expect(getPlatformDisplayName("railway")).toBe("Railway");
      expect(getPlatformDisplayName("fly")).toBe("Fly.io");
      expect(getPlatformDisplayName("docker")).toBe("Docker");
      expect(getPlatformDisplayName("unknown")).toBe("Unknown");
    });
  });
});
