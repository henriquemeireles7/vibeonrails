/**
 * Invoice Generator Tests
 *
 * Tests invoice creation, template rendering, and status management.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createInvoiceGenerator, type InvoiceGenerator } from "./invoice.js";

describe("Invoice Generator", () => {
  let generator: InvoiceGenerator;

  beforeEach(() => {
    generator = createInvoiceGenerator({
      fromName: "VoR Inc",
      fromEmail: "billing@vor.dev",
      fromAddress: "123 Tech St, SF CA 94102",
    });
  });

  // -----------------------------------------------------------------------
  // Create
  // -----------------------------------------------------------------------

  describe("create", () => {
    it("should create an invoice", async () => {
      const invoice = await generator.create({
        clientName: "Acme Corp",
        clientEmail: "billing@acme.com",
        items: [{ description: "Monthly SaaS subscription", unitPrice: 9900 }],
        dueDate: new Date("2026-02-28"),
      });

      expect(invoice.id).toMatch(/^inv_/);
      expect(invoice.invoiceNumber).toMatch(/^INV-/);
      expect(invoice.clientName).toBe("Acme Corp");
      expect(invoice.subtotal).toBe(9900);
      expect(invoice.taxAmount).toBe(0);
      expect(invoice.total).toBe(9900);
      expect(invoice.status).toBe("draft");
    });

    it("should calculate multi-item totals", async () => {
      const invoice = await generator.create({
        clientName: "Corp",
        items: [
          { description: "Subscription", quantity: 1, unitPrice: 9900 },
          { description: "Support add-on", quantity: 2, unitPrice: 2500 },
        ],
        dueDate: new Date("2026-02-28"),
      });

      expect(invoice.subtotal).toBe(9900 + 2 * 2500);
      expect(invoice.total).toBe(9900 + 5000);
    });

    it("should apply tax rate", async () => {
      const invoice = await generator.create({
        clientName: "EU Corp",
        items: [{ description: "Service", unitPrice: 10000 }],
        taxRate: 20,
        dueDate: new Date("2026-02-28"),
      });

      expect(invoice.subtotal).toBe(10000);
      expect(invoice.taxRate).toBe(20);
      expect(invoice.taxAmount).toBe(2000);
      expect(invoice.total).toBe(12000);
    });

    it("should default quantity to 1", async () => {
      const invoice = await generator.create({
        clientName: "Corp",
        items: [{ description: "Item", unitPrice: 5000 }],
        dueDate: new Date("2026-02-28"),
      });

      expect(invoice.items[0]!.quantity).toBe(1);
      expect(invoice.items[0]!.total).toBe(5000);
    });

    it("should set currency", async () => {
      const invoice = await generator.create({
        clientName: "Corp",
        items: [{ description: "Item", unitPrice: 5000 }],
        currency: "EUR",
        dueDate: new Date("2026-02-28"),
      });

      expect(invoice.currency).toBe("EUR");
    });

    it("should validate input", async () => {
      await expect(
        generator.create({
          clientName: "",
          items: [],
          dueDate: new Date(),
        }),
      ).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Get & List
  // -----------------------------------------------------------------------

  describe("get and list", () => {
    it("should get invoice by id", async () => {
      const created = await generator.create({
        clientName: "Corp",
        items: [{ description: "Item", unitPrice: 5000 }],
        dueDate: new Date("2026-02-28"),
      });

      const found = await generator.get(created.id);
      expect(found).toBeDefined();
      expect(found!.clientName).toBe("Corp");
    });

    it("should return undefined for non-existent invoice", async () => {
      const found = await generator.get("inv_nonexistent");
      expect(found).toBeUndefined();
    });

    it("should list invoices", async () => {
      await generator.create({
        clientName: "A",
        items: [{ description: "Item", unitPrice: 1000 }],
        dueDate: new Date("2026-02-28"),
      });
      await generator.create({
        clientName: "B",
        items: [{ description: "Item", unitPrice: 2000 }],
        dueDate: new Date("2026-03-31"),
      });

      const list = await generator.list();
      expect(list).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // Status
  // -----------------------------------------------------------------------

  describe("updateStatus", () => {
    it("should update invoice status", async () => {
      const invoice = await generator.create({
        clientName: "Corp",
        items: [{ description: "Item", unitPrice: 5000 }],
        dueDate: new Date("2026-02-28"),
      });

      const updated = await generator.updateStatus(invoice.id, "sent");
      expect(updated.status).toBe("sent");
    });

    it("should throw for non-existent invoice", async () => {
      await expect(generator.updateStatus("inv_fake", "sent")).rejects.toThrow(
        "Invoice not found",
      );
    });
  });

  // -----------------------------------------------------------------------
  // Rendering
  // -----------------------------------------------------------------------

  describe("renderMarkdown", () => {
    it("should render invoice as markdown", async () => {
      const invoice = await generator.create({
        clientName: "Acme Corp",
        clientEmail: "billing@acme.com",
        items: [
          { description: "SaaS subscription", quantity: 1, unitPrice: 9900 },
        ],
        dueDate: new Date("2026-02-28"),
        notes: "Thank you for your business!",
      });

      const md = await generator.renderMarkdown(invoice.id);

      expect(md).toContain(invoice.invoiceNumber);
      expect(md).toContain("Acme Corp");
      expect(md).toContain("billing@acme.com");
      expect(md).toContain("SaaS subscription");
      expect(md).toContain("$99.00");
      expect(md).toContain("VoR Inc");
      expect(md).toContain("Thank you for your business!");
    });

    it("should throw for non-existent invoice", async () => {
      await expect(generator.renderMarkdown("inv_fake")).rejects.toThrow(
        "Invoice not found",
      );
    });
  });

  describe("renderHtml", () => {
    it("should render invoice as HTML", async () => {
      const invoice = await generator.create({
        clientName: "Corp",
        items: [{ description: "Item", unitPrice: 5000 }],
        dueDate: new Date("2026-02-28"),
      });

      const html = await generator.renderHtml(invoice.id);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<table>");
      expect(html).toContain("Corp");
      expect(html).toContain("$50.00");
    });
  });
});
