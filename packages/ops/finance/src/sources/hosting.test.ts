/**
 * Hosting Cost Source Tests
 *
 * Tests with mock API client (fixture recordings).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createHostingCostSource, type HostingApiClient } from "./hosting.js";
import type { CostSource } from "../types.js";

function createMockHostingClient(): HostingApiClient {
  return {
    async getBillingItems(options) {
      return [
        {
          id: "railway_1",
          date: "2026-01-01T00:00:00.000Z",
          amount: 2500, // $25
          description: "Railway compute (web service)",
          service: "railway",
        },
        {
          id: "railway_2",
          date: "2026-01-15T00:00:00.000Z",
          amount: 1200, // $12
          description: "Railway postgres",
          service: "railway",
        },
        {
          id: "railway_3",
          date: "2026-01-20T00:00:00.000Z",
          amount: 800, // $8
          description: "Railway redis",
          service: "railway",
        },
      ];
    },
  };
}

describe("Hosting Cost Source", () => {
  let source: CostSource;

  beforeEach(() => {
    source = createHostingCostSource(
      { provider: "railway", apiKey: "test-key" },
      createMockHostingClient(),
    );
  });

  it("should have the correct name", () => {
    expect(source.name).toBe("hosting-railway");
  });

  it("should calculate total hosting cost", async () => {
    const cost = await source.getCost({
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    });

    expect(cost).toBe(2500 + 1200 + 800);
  });

  it("should return cost entries", async () => {
    const entries = await source.getCostEntries({
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    });

    expect(entries).toHaveLength(3);
    expect(entries[0]!.source).toBe("hosting-railway");
    expect(entries[0]!.category).toBe("hosting");
    expect(entries[0]!.amount).toBe(2500);
    expect(entries[0]!.description).toBe("Railway compute (web service)");
  });

  it("should include date as Date object", async () => {
    const entries = await source.getCostEntries({
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    });

    for (const entry of entries) {
      expect(entry.date).toBeInstanceOf(Date);
    }
  });
});

describe("Fly.io Hosting Cost Source", () => {
  it("should create with flyio provider name", () => {
    const mockClient: HostingApiClient = {
      async getBillingItems() {
        return [
          {
            id: "fly_1",
            date: "2026-01-01T00:00:00.000Z",
            amount: 3000,
            description: "Fly.io machines",
            service: "flyio",
          },
        ];
      },
    };

    const source = createHostingCostSource(
      { provider: "flyio", apiKey: "test-key" },
      mockClient,
    );

    expect(source.name).toBe("hosting-flyio");
  });

  it("should aggregate fly.io costs", async () => {
    const mockClient: HostingApiClient = {
      async getBillingItems() {
        return [
          {
            id: "fly_1",
            date: "2026-01-01",
            amount: 3000,
            description: "Machines",
            service: "flyio",
          },
          {
            id: "fly_2",
            date: "2026-01-15",
            amount: 1500,
            description: "Volumes",
            service: "flyio",
          },
        ];
      },
    };

    const source = createHostingCostSource(
      { provider: "flyio", apiKey: "test-key" },
      mockClient,
    );

    const cost = await source.getCost({
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    });

    expect(cost).toBe(4500);
  });
});
