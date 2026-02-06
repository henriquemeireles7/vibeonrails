/**
 * Sales CLI Tests
 *
 * Tests all sales CLI commands with mocked output.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createSalesCli, type SalesCli, type CliOutput } from "./cli.js";
import { createSalesService } from "./service.js";
import { createOutreachEngine } from "./outreach.js";
import type { SalesService } from "./types.js";
import type { OutreachEngine } from "./outreach.js";

function createTestOutput(): CliOutput & {
  messages: string[];
  errors: string[];
  tables: Record<string, unknown>[][];
} {
  const messages: string[] = [];
  const errors: string[] = [];
  const tables: Record<string, unknown>[][] = [];

  return {
    messages,
    errors,
    tables,
    log: (msg) => messages.push(msg),
    error: (msg) => errors.push(msg),
    table: (data) => tables.push(data),
  };
}

describe("Sales CLI", () => {
  let service: SalesService;
  let outreach: OutreachEngine;
  let output: ReturnType<typeof createTestOutput>;
  let cli: SalesCli;

  beforeEach(() => {
    service = createSalesService();
    outreach = createOutreachEngine();
    output = createTestOutput();
    cli = createSalesCli({ service, outreach, output });
  });

  // -----------------------------------------------------------------------
  // Contacts List
  // -----------------------------------------------------------------------

  describe("contacts list", () => {
    it("should show empty message when no contacts", async () => {
      await cli.contactsList();
      expect(output.messages).toContain("No contacts found.");
    });

    it("should list contacts in table format", async () => {
      await service.addContact({
        email: "a@test.com",
        name: "Alice",
        company: "Acme",
      });
      await service.addContact({ email: "b@test.com", name: "Bob" });

      await cli.contactsList();
      expect(output.tables).toHaveLength(1);
      expect(output.tables[0]).toHaveLength(2);
      expect(output.messages.some((m) => m.includes("2 contact(s)"))).toBe(
        true,
      );
    });

    it("should filter by stage", async () => {
      await service.addContact({
        email: "a@test.com",
        name: "A",
        stage: "lead",
      });
      await service.addContact({
        email: "b@test.com",
        name: "B",
        stage: "customer",
      });

      await cli.contactsList({ stage: "lead" });
      expect(output.tables[0]).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Contacts Add
  // -----------------------------------------------------------------------

  describe("contacts add", () => {
    it("should add a contact and display info", async () => {
      await cli.contactsAdd({
        email: "new@test.com",
        name: "New Person",
        company: "NewCo",
      });

      expect(output.messages.some((m) => m.includes("Contact created"))).toBe(
        true,
      );
      expect(output.messages.some((m) => m.includes("New Person"))).toBe(true);
      expect(output.messages.some((m) => m.includes("new@test.com"))).toBe(
        true,
      );
    });
  });

  // -----------------------------------------------------------------------
  // Contacts Import
  // -----------------------------------------------------------------------

  describe("contacts import", () => {
    it("should import and show results", async () => {
      const csv = `name,email,company
Alice,alice@test.com,Acme
Bob,bob@test.com,Corp`;

      await cli.contactsImport(csv);
      expect(output.messages.some((m) => m.includes("Imported: 2"))).toBe(true);
    });

    it("should show errors for invalid rows", async () => {
      const csv = `name,email
,missing@test.com`;

      await cli.contactsImport(csv);
      expect(output.messages.some((m) => m.includes("Errors"))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Deals List
  // -----------------------------------------------------------------------

  describe("deals list", () => {
    it("should show empty message when no deals", async () => {
      await cli.dealsList();
      expect(output.messages).toContain("No deals found.");
    });

    it("should list deals with formatted values", async () => {
      const contact = await service.addContact({
        email: "c@test.com",
        name: "Client",
      });
      await service.createDeal({
        title: "Big Deal",
        contactId: contact.id,
        value: 500000,
      });

      await cli.dealsList();
      expect(output.tables).toHaveLength(1);
      expect(output.tables[0]![0]!["value"]).toBe("$5000.00");
    });
  });

  // -----------------------------------------------------------------------
  // Deals Create
  // -----------------------------------------------------------------------

  describe("deals create", () => {
    it("should create a deal and display info", async () => {
      const contact = await service.addContact({
        email: "c@test.com",
        name: "Client",
      });

      await cli.dealsCreate({
        title: "Enterprise",
        contactId: contact.id,
        value: 1000000,
      });

      expect(output.messages.some((m) => m.includes("Deal created"))).toBe(
        true,
      );
      expect(output.messages.some((m) => m.includes("Enterprise"))).toBe(true);
      expect(output.messages.some((m) => m.includes("$10000.00"))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Outreach Create
  // -----------------------------------------------------------------------

  describe("outreach create", () => {
    it("should create an outreach sequence", async () => {
      await cli.outreachCreate({
        name: "Q1 Campaign",
        contactIds: ["con_1", "con_2"],
        steps: [
          { delayDays: 0, subject: "Intro", body: "Hi {{name}}" },
          { delayDays: 3, subject: "Follow up", body: "Checking in..." },
        ],
      });

      expect(
        output.messages.some((m) => m.includes("Outreach sequence created")),
      ).toBe(true);
      expect(output.messages.some((m) => m.includes("Q1 Campaign"))).toBe(true);
      expect(output.messages.some((m) => m.includes("Steps: 2"))).toBe(true);
    });
  });

  // -----------------------------------------------------------------------
  // Report
  // -----------------------------------------------------------------------

  describe("report", () => {
    it("should generate empty report", async () => {
      await cli.report();
      expect(output.messages.some((m) => m.includes("Sales Report"))).toBe(
        true,
      );
      expect(output.messages.some((m) => m.includes("Contacts: 0"))).toBe(true);
      expect(output.messages.some((m) => m.includes("Deals: 0"))).toBe(true);
    });

    it("should generate report with data", async () => {
      await service.addContact({ email: "a@test.com", name: "A" });
      const contact = await service.addContact({
        email: "b@test.com",
        name: "B",
      });
      const deal = await service.createDeal({
        title: "Deal",
        contactId: contact.id,
        value: 100000,
      });
      await service.updateDealStage(deal.id, "closed_won");

      await cli.report();
      expect(output.messages.some((m) => m.includes("Contacts: 2"))).toBe(true);
      expect(
        output.messages.some((m) => m.includes("Won Value: $1000.00")),
      ).toBe(true);
    });
  });
});
