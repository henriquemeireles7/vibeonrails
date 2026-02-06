import { describe, it, expect } from "vitest";
import { runSeeds } from "./index.js";

describe("runSeeds", () => {
  it("is a function", () => {
    expect(typeof runSeeds).toBe("function");
  });

  it("exports seedDevelopment and seedTest", async () => {
    const seeds = await import("./index.js");
    expect(typeof seeds.seedDevelopment).toBe("function");
    expect(typeof seeds.seedTest).toBe("function");
    expect(typeof seeds.runSeeds).toBe("function");
  });

  it("runSeeds throws when called without a real db", async () => {
    const fakeDb = {} as never;
    await expect(runSeeds(fakeDb, "test")).rejects.toThrow();
  });
});
