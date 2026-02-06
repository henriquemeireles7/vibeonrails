import { describe, it, expect, beforeEach } from "vitest";
import { defineCron, getCronJobs, getCronJob, clearCronJobs, isValidCronExpression } from "./cron.js";

describe("Cron Jobs", () => {
  beforeEach(() => {
    clearCronJobs();
  });

  it("defines a cron job", () => {
    const job = defineCron({
      name: "test-job",
      schedule: "0 * * * *",
      handler: () => {},
    });
    expect(job.name).toBe("test-job");
    expect(job.schedule).toBe("0 * * * *");
  });

  it("registers in the global registry", () => {
    defineCron({ name: "job-1", schedule: "0 0 * * *", handler: () => {} });
    defineCron({ name: "job-2", schedule: "*/5 * * * *", handler: () => {} });
    expect(getCronJobs()).toHaveLength(2);
  });

  it("retrieves a job by name", () => {
    defineCron({ name: "my-job", schedule: "0 0 * * *", handler: () => {} });
    const job = getCronJob("my-job");
    expect(job).toBeDefined();
    expect(job!.name).toBe("my-job");
  });

  it("returns undefined for unknown job", () => {
    expect(getCronJob("nonexistent")).toBeUndefined();
  });

  it("defaults to enabled", () => {
    const job = defineCron({ name: "enabled-job", schedule: "0 * * * *", handler: () => {} });
    expect(job.enabled).toBe(true);
  });

  it("validates cron expressions", () => {
    expect(isValidCronExpression("0 * * * *")).toBe(true);
    expect(isValidCronExpression("*/5 * * * *")).toBe(true);
    expect(isValidCronExpression("bad")).toBe(false);
    expect(isValidCronExpression("0 * *")).toBe(false);
  });
});
