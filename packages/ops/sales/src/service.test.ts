/**
 * Sales Service Tests
 *
 * Tests for contact CRUD, deal management, CSV import, and stage transitions.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createSalesService } from "./service.js";
import type { SalesService } from "./types.js";

describe("Sales Service", () => {
  let sales: SalesService;

  beforeEach(() => {
    sales = createSalesService();
  });

  // -----------------------------------------------------------------------
  // Contacts
  // -----------------------------------------------------------------------

  describe("Contacts", () => {
    it("should add a contact", async () => {
      const contact = await sales.addContact({
        email: "jane@acme.com",
        name: "Jane Doe",
        company: "Acme Corp",
      });

      expect(contact.id).toMatch(/^con_/);
      expect(contact.email).toBe("jane@acme.com");
      expect(contact.name).toBe("Jane Doe");
      expect(contact.company).toBe("Acme Corp");
      expect(contact.stage).toBe("lead");
      expect(contact.tags).toEqual([]);
      expect(contact.createdAt).toBeInstanceOf(Date);
    });

    it("should get a contact by id", async () => {
      const created = await sales.addContact({
        email: "john@example.com",
        name: "John Smith",
      });

      const found = await sales.getContact(created.id);
      expect(found).toBeDefined();
      expect(found!.email).toBe("john@example.com");
    });

    it("should return undefined for non-existent contact", async () => {
      const found = await sales.getContact("con_nonexistent");
      expect(found).toBeUndefined();
    });

    it("should list contacts", async () => {
      await sales.addContact({ email: "a@test.com", name: "Alice" });
      await sales.addContact({ email: "b@test.com", name: "Bob" });
      await sales.addContact({ email: "c@test.com", name: "Charlie" });

      const contacts = await sales.listContacts();
      expect(contacts).toHaveLength(3);
    });

    it("should filter contacts by stage", async () => {
      await sales.addContact({
        email: "lead@test.com",
        name: "Lead",
        stage: "lead",
      });
      await sales.addContact({
        email: "cust@test.com",
        name: "Customer",
        stage: "customer",
      });

      const leads = await sales.listContacts({ stage: "lead" });
      expect(leads).toHaveLength(1);
      expect(leads[0]!.name).toBe("Lead");
    });

    it("should search contacts", async () => {
      await sales.addContact({
        email: "alice@acme.com",
        name: "Alice",
        company: "Acme",
      });
      await sales.addContact({
        email: "bob@other.com",
        name: "Bob",
        company: "Other",
      });

      const results = await sales.listContacts({ search: "acme" });
      expect(results).toHaveLength(1);
      expect(results[0]!.name).toBe("Alice");
    });

    it("should paginate contacts", async () => {
      await sales.addContact({ email: "a@test.com", name: "A" });
      await sales.addContact({ email: "b@test.com", name: "B" });
      await sales.addContact({ email: "c@test.com", name: "C" });

      const page = await sales.listContacts({ limit: 2 });
      expect(page).toHaveLength(2);
    });

    it("should update contact stage", async () => {
      const contact = await sales.addContact({
        email: "lead@test.com",
        name: "Lead",
      });

      const updated = await sales.updateContactStage(contact.id, "qualified");
      expect(updated.stage).toBe("qualified");
      expect(updated.updatedAt.getTime()).toBeGreaterThanOrEqual(
        contact.updatedAt.getTime(),
      );
    });

    it("should throw when updating non-existent contact", async () => {
      await expect(
        sales.updateContactStage("con_fake", "qualified"),
      ).rejects.toThrow("Contact not found");
    });

    it("should validate contact input", async () => {
      await expect(
        sales.addContact({ email: "invalid", name: "Bad" }),
      ).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // CSV Import
  // -----------------------------------------------------------------------

  describe("CSV Import", () => {
    it("should import contacts from CSV", async () => {
      const csv = `name,email,company,stage
Jane Doe,jane@acme.com,Acme Corp,lead
John Smith,john@example.com,,qualified`;

      const result = await sales.importContactsFromCsv(csv);
      expect(result.imported).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);

      const contacts = await sales.listContacts();
      expect(contacts).toHaveLength(2);
    });

    it("should skip duplicate emails", async () => {
      await sales.addContact({ email: "dupe@test.com", name: "Existing" });

      const csv = `name,email
New Person,dupe@test.com`;

      const result = await sales.importContactsFromCsv(csv);
      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it("should report errors for missing fields", async () => {
      const csv = `name,email
,missing-email@test.com
No Email,`;

      const result = await sales.importContactsFromCsv(csv);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle empty CSV", async () => {
      const result = await sales.importContactsFromCsv("");
      expect(result.imported).toBe(0);
      expect(result.errors).toHaveLength(1);
    });

    it("should handle CSV with tags", async () => {
      const csv = `name,email,tags
Tagged,tagged@test.com,saas;enterprise`;

      const result = await sales.importContactsFromCsv(csv);
      expect(result.imported).toBe(1);

      const contacts = await sales.listContacts();
      expect(contacts[0]!.tags).toEqual(["saas", "enterprise"]);
    });

    it("should reject invalid stages", async () => {
      const csv = `name,email,stage
Bad,bad@test.com,invalid_stage`;

      const result = await sales.importContactsFromCsv(csv);
      expect(result.skipped).toBe(1);
      expect(result.errors[0]!.message).toContain("Invalid stage");
    });
  });

  // -----------------------------------------------------------------------
  // Deals
  // -----------------------------------------------------------------------

  describe("Deals", () => {
    it("should create a deal", async () => {
      const contact = await sales.addContact({
        email: "c@test.com",
        name: "Client",
      });

      const deal = await sales.createDeal({
        title: "Enterprise License",
        contactId: contact.id,
        value: 5000000, // $50,000
      });

      expect(deal.id).toMatch(/^deal_/);
      expect(deal.title).toBe("Enterprise License");
      expect(deal.value).toBe(5000000);
      expect(deal.stage).toBe("discovery");
    });

    it("should get a deal by id", async () => {
      const contact = await sales.addContact({
        email: "c@test.com",
        name: "Client",
      });
      const created = await sales.createDeal({
        title: "Test Deal",
        contactId: contact.id,
        value: 10000,
      });

      const found = await sales.getDeal(created.id);
      expect(found).toBeDefined();
      expect(found!.title).toBe("Test Deal");
    });

    it("should list deals", async () => {
      const contact = await sales.addContact({
        email: "c@test.com",
        name: "Client",
      });
      await sales.createDeal({
        title: "Deal 1",
        contactId: contact.id,
        value: 10000,
      });
      await sales.createDeal({
        title: "Deal 2",
        contactId: contact.id,
        value: 20000,
      });

      const deals = await sales.listDeals();
      expect(deals).toHaveLength(2);
    });

    it("should filter deals by stage", async () => {
      const contact = await sales.addContact({
        email: "c@test.com",
        name: "Client",
      });
      const deal = await sales.createDeal({
        title: "Deal",
        contactId: contact.id,
        value: 10000,
      });
      await sales.updateDealStage(deal.id, "proposal");

      const proposals = await sales.listDeals({ stage: "proposal" });
      expect(proposals).toHaveLength(1);
    });

    it("should filter deals by contactId", async () => {
      const c1 = await sales.addContact({ email: "c1@test.com", name: "C1" });
      const c2 = await sales.addContact({ email: "c2@test.com", name: "C2" });
      await sales.createDeal({ title: "D1", contactId: c1.id, value: 10000 });
      await sales.createDeal({ title: "D2", contactId: c2.id, value: 20000 });

      const c1Deals = await sales.listDeals({ contactId: c1.id });
      expect(c1Deals).toHaveLength(1);
      expect(c1Deals[0]!.title).toBe("D1");
    });

    it("should update deal stage with probability", async () => {
      const contact = await sales.addContact({
        email: "c@test.com",
        name: "Client",
      });
      const deal = await sales.createDeal({
        title: "Deal",
        contactId: contact.id,
        value: 10000,
      });

      const updated = await sales.updateDealStage(deal.id, "negotiation");
      expect(updated.stage).toBe("negotiation");
      expect(updated.probability).toBe(75);
    });

    it("should set 100% probability for closed_won", async () => {
      const contact = await sales.addContact({
        email: "c@test.com",
        name: "Client",
      });
      const deal = await sales.createDeal({
        title: "Deal",
        contactId: contact.id,
        value: 10000,
      });

      const updated = await sales.updateDealStage(deal.id, "closed_won");
      expect(updated.probability).toBe(100);
    });

    it("should throw when updating non-existent deal", async () => {
      await expect(
        sales.updateDealStage("deal_fake", "proposal"),
      ).rejects.toThrow("Deal not found");
    });
  });

  // -----------------------------------------------------------------------
  // Qualification
  // -----------------------------------------------------------------------

  describe("Qualification", () => {
    it("should qualify a contact with BANT", async () => {
      const contact = await sales.addContact({
        email: "prospect@company.com",
        name: "Prospect",
        company: "Big Corp",
        phone: "+1234567890",
        notes: "Interested in enterprise plan",
      });

      const score = await sales.qualifyContact(contact.id);
      expect(score.total).toBeGreaterThan(0);
      expect(score.total).toBeLessThanOrEqual(100);
      expect(score.budget).toBeDefined();
      expect(score.authority).toBeDefined();
      expect(score.need).toBeDefined();
      expect(score.timeline).toBeDefined();
      expect(score.summary).toBeTruthy();
    });

    it("should update contact score after qualification", async () => {
      const contact = await sales.addContact({
        email: "score@test.com",
        name: "ScoreMe",
      });

      const score = await sales.qualifyContact(contact.id);
      const updated = await sales.getContact(contact.id);
      expect(updated!.score).toBe(score.total);
    });

    it("should throw when qualifying non-existent contact", async () => {
      await expect(sales.qualifyContact("con_fake")).rejects.toThrow(
        "Contact not found",
      );
    });

    it("should use custom qualification function", async () => {
      const customSales = createSalesService({
        qualify: async () => ({
          budget: 25,
          authority: 25,
          need: 25,
          timeline: 25,
          total: 100,
          summary: "Perfect score from custom qualifier",
        }),
      });

      const contact = await customSales.addContact({
        email: "custom@test.com",
        name: "Custom",
      });

      const score = await customSales.qualifyContact(contact.id);
      expect(score.total).toBe(100);
      expect(score.summary).toContain("custom qualifier");
    });
  });

  // -----------------------------------------------------------------------
  // Reports
  // -----------------------------------------------------------------------

  describe("Reports", () => {
    it("should generate an empty report", async () => {
      const report = await sales.generateReport();
      expect(report.totalContacts).toBe(0);
      expect(report.totalDeals).toBe(0);
      expect(report.pipelineValue).toBe(0);
      expect(report.wonValue).toBe(0);
      expect(report.winRate).toBe(0);
    });

    it("should generate a report with data", async () => {
      await sales.addContact({ email: "a@test.com", name: "A", stage: "lead" });
      await sales.addContact({
        email: "b@test.com",
        name: "B",
        stage: "customer",
      });

      const contact = await sales.addContact({
        email: "c@test.com",
        name: "C",
      });
      const deal1 = await sales.createDeal({
        title: "Won",
        contactId: contact.id,
        value: 50000,
      });
      const deal2 = await sales.createDeal({
        title: "Lost",
        contactId: contact.id,
        value: 30000,
      });
      const deal3 = await sales.createDeal({
        title: "Open",
        contactId: contact.id,
        value: 20000,
      });

      await sales.updateDealStage(deal1.id, "closed_won");
      await sales.updateDealStage(deal2.id, "closed_lost");

      const report = await sales.generateReport();
      expect(report.totalContacts).toBe(3);
      expect(report.totalDeals).toBe(3);
      expect(report.pipelineValue).toBe(20000); // Only open deal
      expect(report.wonValue).toBe(50000);
      expect(report.winRate).toBe(50); // 1 won out of 2 closed
      expect(report.generatedAt).toBeInstanceOf(Date);
    });
  });
});
