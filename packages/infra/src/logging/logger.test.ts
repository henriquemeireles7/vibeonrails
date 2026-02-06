import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Logger, createLogger } from "./logger.js";

describe("Logger", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = "test";
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  // -----------------------------------------------------------------------
  // Basic logging
  // -----------------------------------------------------------------------

  it("should log info messages in dev mode", () => {
    const lines: string[] = [];
    const log = new Logger({ writer: (line) => lines.push(line) });

    log.info("Test message");

    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("INFO");
    expect(lines[0]).toContain("Test message");
  });

  it("should log with additional data", () => {
    const lines: string[] = [];
    const log = new Logger({ writer: (line) => lines.push(line) });

    log.info("Server started", { port: 3000 });

    expect(lines[0]).toContain("Server started");
    expect(lines[0]).toContain("3000");
  });

  it("should log errors with stack traces", () => {
    const lines: string[] = [];
    const log = new Logger({ writer: (line) => lines.push(line) });

    log.error("Something failed", new Error("Boom"));

    expect(lines[0]).toContain("ERROR");
    expect(lines[0]).toContain("Something failed");
  });

  it("should log error with plain object data", () => {
    const lines: string[] = [];
    const log = new Logger({ writer: (line) => lines.push(line) });

    log.error("Failed", { code: "E001" });

    expect(lines[0]).toContain("E001");
  });

  it("should log debug messages", () => {
    const lines: string[] = [];
    const log = new Logger({
      writer: (line) => lines.push(line),
      minLevel: "debug",
    });

    log.debug("Debug info", { detail: "x" });

    expect(lines[0]).toContain("DEBUG");
  });

  it("should log warn messages", () => {
    const lines: string[] = [];
    const log = new Logger({ writer: (line) => lines.push(line) });

    log.warn("Deprecation", { api: "/old" });

    expect(lines[0]).toContain("WARN");
  });

  // -----------------------------------------------------------------------
  // JSON output (production mode)
  // -----------------------------------------------------------------------

  it("should output structured JSON in production mode", () => {
    process.env.NODE_ENV = "production";
    const lines: string[] = [];
    const log = new Logger({ writer: (line) => lines.push(line) });

    log.info("Production log");

    const parsed = JSON.parse(lines[0]);
    expect(parsed.level).toBe("info");
    expect(parsed.message).toBe("Production log");
    expect(parsed.timestamp).toBeDefined();
  });

  it("should include module in JSON output", () => {
    process.env.NODE_ENV = "production";
    const lines: string[] = [];
    const log = new Logger({
      module: "api",
      writer: (line) => lines.push(line),
    });

    log.info("Request handled");

    const parsed = JSON.parse(lines[0]);
    expect(parsed.module).toBe("api");
  });

  it("should include request_id at top level in JSON output", () => {
    process.env.NODE_ENV = "production";
    const lines: string[] = [];
    const log = new Logger({
      writer: (line) => lines.push(line),
      context: { requestId: "req-abc-123" },
    });

    log.info("Processing");

    const parsed = JSON.parse(lines[0]);
    expect(parsed.requestId).toBe("req-abc-123");
  });

  it("should merge extra data into JSON output", () => {
    process.env.NODE_ENV = "production";
    const lines: string[] = [];
    const log = new Logger({ writer: (line) => lines.push(line) });

    log.info("Query done", { durationMs: 42, table: "users" });

    const parsed = JSON.parse(lines[0]);
    expect(parsed.durationMs).toBe(42);
    expect(parsed.table).toBe("users");
  });

  // -----------------------------------------------------------------------
  // Request ID propagation
  // -----------------------------------------------------------------------

  it("should propagate requestId through child loggers", () => {
    process.env.NODE_ENV = "production";
    const lines: string[] = [];
    const parent = new Logger({
      module: "api",
      writer: (line) => lines.push(line),
    });
    const child = parent.child({ requestId: "req-xyz" });

    child.info("Child log");

    const parsed = JSON.parse(lines[0]);
    expect(parsed.requestId).toBe("req-xyz");
    expect(parsed.module).toBe("api");
  });

  it("should allow requestId override in data", () => {
    process.env.NODE_ENV = "production";
    const lines: string[] = [];
    const log = new Logger({
      writer: (line) => lines.push(line),
      context: { requestId: "original" },
    });

    log.info("Overridden", { requestId: "new-id" });

    const parsed = JSON.parse(lines[0]);
    expect(parsed.requestId).toBe("new-id");
  });

  // -----------------------------------------------------------------------
  // Child loggers
  // -----------------------------------------------------------------------

  it("should create child loggers with inherited context", () => {
    process.env.NODE_ENV = "production";
    const lines: string[] = [];
    const parent = new Logger({
      module: "api",
      writer: (line) => lines.push(line),
      context: { service: "web" },
    });
    const child = parent.child({ requestId: "123", userId: "u1" });

    child.info("Child message");

    const parsed = JSON.parse(lines[0]);
    expect(parsed.module).toBe("api");
    expect(parsed.requestId).toBe("123");
    expect(parsed.userId).toBe("u1");
    expect(parsed.service).toBe("web");
  });

  it("should allow child to override module", () => {
    const lines: string[] = [];
    const parent = new Logger({
      module: "api",
      writer: (line) => lines.push(line),
    });
    const child = parent.child({ module: "db" });

    expect(child.getModule()).toBe("db");
  });

  // -----------------------------------------------------------------------
  // Level filtering
  // -----------------------------------------------------------------------

  it("should respect minimum log level", () => {
    const lines: string[] = [];
    const log = new Logger({
      writer: (line) => lines.push(line),
      minLevel: "warn",
    });

    log.debug("Should not appear");
    log.info("Should not appear either");
    log.warn("Should appear");
    log.error("Should also appear");

    expect(lines).toHaveLength(2);
  });

  it("should read LOG_LEVEL from env", () => {
    process.env.LOG_LEVEL = "error";
    const lines: string[] = [];
    const log = new Logger({ writer: (line) => lines.push(line) });

    log.info("Filtered out");
    log.error("Visible");

    expect(lines).toHaveLength(1);
    delete process.env.LOG_LEVEL;
  });

  it("should report enabled level correctly", () => {
    const log = new Logger({ minLevel: "warn" });

    expect(log.isLevelEnabled("debug")).toBe(false);
    expect(log.isLevelEnabled("info")).toBe(false);
    expect(log.isLevelEnabled("warn")).toBe(true);
    expect(log.isLevelEnabled("error")).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Dev formatting
  // -----------------------------------------------------------------------

  it("should include time in dev format", () => {
    const lines: string[] = [];
    const log = new Logger({ writer: (line) => lines.push(line) });

    log.info("Hello");

    // Dev format includes HH:mm:ss.SSS time
    expect(lines[0]).toMatch(/\d{2}:\d{2}:\d{2}\.\d{3}/);
  });

  it("should include module name in dev format", () => {
    const lines: string[] = [];
    const log = new Logger({
      module: "queue",
      writer: (line) => lines.push(line),
    });

    log.info("Job processed");

    expect(lines[0]).toContain("(queue)");
  });

  it("should include truncated requestId in dev format", () => {
    const lines: string[] = [];
    const log = new Logger({
      writer: (line) => lines.push(line),
      context: { requestId: "abcdefgh-1234" },
    });

    log.info("Request");

    // Shows first 8 chars of requestId
    expect(lines[0]).toContain("[abcdefgh]");
  });

  // -----------------------------------------------------------------------
  // Factory function
  // -----------------------------------------------------------------------

  it("should create logger via factory", () => {
    const lines: string[] = [];
    const log = createLogger({
      module: "test",
      writer: (line) => lines.push(line),
    });

    log.info("Factory works");

    expect(lines).toHaveLength(1);
    expect(log.getModule()).toBe("test");
  });

  // -----------------------------------------------------------------------
  // Context access
  // -----------------------------------------------------------------------

  it("should expose context via getContext", () => {
    const log = new Logger({ context: { requestId: "123", userId: "u1" } });
    const ctx = log.getContext();

    expect(ctx.requestId).toBe("123");
    expect(ctx.userId).toBe("u1");
  });

  it("should return a copy of context (not mutable)", () => {
    const log = new Logger({ context: { key: "value" } });
    const ctx = log.getContext();
    ctx.key = "mutated";

    expect(log.getContext().key).toBe("value");
  });
});
