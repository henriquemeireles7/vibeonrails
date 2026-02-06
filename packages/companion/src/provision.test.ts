import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  detectOpenClaw,
  provisionRailway,
  provisionDocker,
  connectExisting,
  installSkills,
  type OpenClawInstance,
  type ProvisionResult,
  type DetectionResult,
} from "./provision.js";

// VOR: OpenClaw provisioning tests - detection, Railway deploy, Docker compose, existing connection

describe("OpenClaw Provisioning", () => {
  describe("detectOpenClaw", () => {
    it("detects running OpenClaw instance", async () => {
      const fetcher = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            version: "0.6.0",
            status: "running",
            skills: [],
          }),
      });

      const result = await detectOpenClaw("http://localhost:3100", fetcher);

      expect(result.found).toBe(true);
      expect(result.version).toBe("0.6.0");
      expect(result.url).toBe("http://localhost:3100");
    });

    it("returns not found when instance is unreachable", async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await detectOpenClaw("http://localhost:3100", fetcher);

      expect(result.found).toBe(false);
      expect(result.version).toBeUndefined();
    });

    it("returns not found for non-200 responses", async () => {
      const fetcher = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await detectOpenClaw("http://localhost:3100", fetcher);

      expect(result.found).toBe(false);
    });
  });

  describe("provisionRailway", () => {
    it("returns Railway template URL and instructions", async () => {
      const result = await provisionRailway();

      expect(result.method).toBe("railway");
      expect(result.templateUrl).toContain("railway.app");
      expect(result.instructions).toBeDefined();
      expect(result.instructions.length).toBeGreaterThan(0);
    });

    it("includes estimated deploy time", async () => {
      const result = await provisionRailway();

      expect(result.estimatedSeconds).toBeLessThanOrEqual(120);
    });
  });

  describe("provisionDocker", () => {
    it("generates docker compose configuration", async () => {
      const result = await provisionDocker({
        projectName: "my-saas",
        port: 3100,
      });

      expect(result.method).toBe("docker");
      expect(result.composeContent).toContain("openclaw");
      expect(result.composeContent).toContain("3100");
      expect(result.composeContent).toContain("my-saas");
    });

    it("uses default port when not specified", async () => {
      const result = await provisionDocker({ projectName: "test-app" });

      expect(result.composeContent).toContain("3100");
    });

    it("includes volume for persistent data", async () => {
      const result = await provisionDocker({ projectName: "test-app" });

      expect(result.composeContent).toContain("volumes:");
      expect(result.composeContent).toContain("openclaw-data");
    });
  });

  describe("connectExisting", () => {
    it("connects to an existing OpenClaw instance", async () => {
      const fetcher = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            version: "0.6.0",
            status: "running",
            skills: ["vibe-project"],
          }),
      });

      const result = await connectExisting(
        "https://openclaw.myserver.com",
        fetcher,
      );

      expect(result.connected).toBe(true);
      expect(result.instance).toBeDefined();
      expect(result.instance?.url).toBe("https://openclaw.myserver.com");
      expect(result.instance?.version).toBe("0.6.0");
    });

    it("reports failure when instance is not reachable", async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

      const result = await connectExisting(
        "https://unreachable.example.com",
        fetcher,
      );

      expect(result.connected).toBe(false);
      expect(result.error).toBe("Could not connect to OpenClaw instance");
    });

    it("reports incompatible version", async () => {
      const fetcher = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            version: "0.3.0",
            status: "running",
            skills: [],
          }),
      });

      const result = await connectExisting("https://old.openclaw.com", fetcher);

      expect(result.connected).toBe(false);
      expect(result.error).toContain("incompatible");
    });
  });

  describe("installSkills", () => {
    it("installs VoR skills into OpenClaw instance", async () => {
      const fetcher = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ installed: true }),
      });

      const instance: OpenClawInstance = {
        url: "http://localhost:3100",
        version: "0.6.0",
        skills: [],
      };

      const result = await installSkills(instance, {
        skills: ["vibe-project", "vibe-marketing", "vibe-x402"],
        fetcher,
      });

      expect(result.installed).toEqual([
        "vibe-project",
        "vibe-marketing",
        "vibe-x402",
      ]);
      expect(result.failed).toEqual([]);
    });

    it("reports partially failed installations", async () => {
      let callCount = 0;
      const fetcher = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 2) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ installed: true }),
        });
      });

      const instance: OpenClawInstance = {
        url: "http://localhost:3100",
        version: "0.6.0",
        skills: [],
      };

      const result = await installSkills(instance, {
        skills: ["vibe-project", "vibe-marketing", "vibe-x402"],
        fetcher,
      });

      expect(result.installed.length).toBe(2);
      expect(result.failed.length).toBe(1);
    });
  });
});
