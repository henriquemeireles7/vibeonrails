import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { detectSecurityChanges, formatConfigChange } from "./config-diff.js";
import type { ConfigChange } from "./config-diff.js";

// ---------------------------------------------------------------------------
// Security Detection
// ---------------------------------------------------------------------------

describe("Config Diff", () => {
  describe("detectSecurityChanges", () => {
    it("detects CORS changes", () => {
      const diff = '+  cors: { allowedOrigins: ["https://evil.com"] }';
      const findings = detectSecurityChanges(diff);
      expect(findings.length).toBeGreaterThan(0);
      expect(findings.some((f) => f.toLowerCase().includes("cors"))).toBe(true);
    });

    it("detects rate limit changes", () => {
      const diff = "+  rateLimit: { max: 1000 }";
      const findings = detectSecurityChanges(diff);
      expect(findings.some((f) => f.toLowerCase().includes("rate"))).toBe(true);
    });

    it("detects authentication changes", () => {
      const diff = "+  auth: { providers: ['google'] }";
      const findings = detectSecurityChanges(diff);
      expect(findings.some((f) => f.toLowerCase().includes("auth"))).toBe(true);
    });

    it("detects JWT changes", () => {
      const diff = "+  jwt: { expiresIn: '30d' }";
      const findings = detectSecurityChanges(diff);
      expect(findings.some((f) => f.toLowerCase().includes("jwt"))).toBe(true);
    });

    it("detects session changes", () => {
      const diff = "+  session: { maxAge: 86400 }";
      const findings = detectSecurityChanges(diff);
      expect(findings.some((f) => f.toLowerCase().includes("session"))).toBe(
        true,
      );
    });

    it("detects CSRF changes", () => {
      const diff = "-  csrf: true\n+  csrf: false";
      const findings = detectSecurityChanges(diff);
      expect(findings.some((f) => f.toLowerCase().includes("csrf"))).toBe(true);
    });

    it("returns empty array for non-security changes", () => {
      const diff = "+  port: 3001\n+  name: 'my-app'";
      const findings = detectSecurityChanges(diff);
      expect(findings).toEqual([]);
    });

    it("returns empty array for empty diff", () => {
      expect(detectSecurityChanges("")).toEqual([]);
    });

    it("detects multiple security patterns in one diff", () => {
      const diff =
        "+  cors: { origins: ['*'] }\n+  rateLimit: { max: 99999 }\n+  csrf: false";
      const findings = detectSecurityChanges(diff);
      expect(findings.length).toBeGreaterThanOrEqual(3);
    });
  });

  // -------------------------------------------------------------------------
  // Formatting
  // -------------------------------------------------------------------------

  describe("formatConfigChange", () => {
    it("includes file name in output", () => {
      const change: ConfigChange = {
        file: "vibe.config.ts",
        diff: "+port: 3001",
        securityRelevant: false,
        securityDetails: [],
      };
      const output = formatConfigChange(change);
      expect(output).toContain("vibe.config.ts");
    });

    it("shows SECURITY tag for security-relevant changes", () => {
      const change: ConfigChange = {
        file: "config/security.ts",
        diff: "+csrf: false",
        securityRelevant: true,
        securityDetails: ["CSRF protection configuration changed"],
      };
      const output = formatConfigChange(change);
      expect(output).toContain("SECURITY");
      expect(output).toContain("CSRF");
    });

    it("shows diff additions in output", () => {
      const change: ConfigChange = {
        file: "vibe.config.ts",
        diff: "+  newSetting: true",
        securityRelevant: false,
        securityDetails: [],
      };
      const output = formatConfigChange(change);
      expect(output).toContain("newSetting");
    });

    it("truncates long diffs", () => {
      const longDiff = Array.from({ length: 50 }, (_, i) => `+line${i}`)
        .join("\n");
      const change: ConfigChange = {
        file: "vibe.config.ts",
        diff: longDiff,
        securityRelevant: false,
        securityDetails: [],
      };
      const output = formatConfigChange(change);
      expect(output).toContain("more lines");
    });
  });
});
