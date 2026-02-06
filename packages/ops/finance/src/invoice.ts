/**
 * Invoice Generator
 *
 * Generates invoices from templates. Renders markdown to HTML.
 * Supports sending via email (when email provider is configured).
 */

import {
  type Invoice,
  type InvoiceInput,
  InvoiceInputSchema,
  type InvoiceGeneratorConfig,
} from "./types.js";

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${timestamp}${random}`;
}

function generateInvoiceNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const seq = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
  return `INV-${year}${month}-${seq}`;
}

// ---------------------------------------------------------------------------
// Amount Calculations
// ---------------------------------------------------------------------------

function calculateInvoiceTotals(input: InvoiceInput): {
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount: number;
  total: number;
} {
  const items = input.items.map((item) => {
    const quantity = item.quantity ?? 1;
    const total = quantity * item.unitPrice;
    return {
      description: item.description,
      quantity,
      unitPrice: item.unitPrice,
      total,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxRate = input.taxRate ?? 0;
  const taxAmount = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + taxAmount;

  return { items, subtotal, taxAmount, total };
}

// ---------------------------------------------------------------------------
// Format Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number, currency: string = "USD"): string {
  const symbols: Record<string, string> = {
    USD: "$",
    EUR: "\u20AC",
    GBP: "\u00A3",
    BRL: "R$",
  };
  const symbol = symbols[currency] ?? currency;
  return `${symbol}${(cents / 100).toFixed(2)}`;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

// ---------------------------------------------------------------------------
// Markdown Template Rendering
// ---------------------------------------------------------------------------

function renderInvoiceMarkdown(
  invoice: Invoice,
  config: InvoiceGeneratorConfig,
): string {
  const currency = invoice.currency;

  let md = `# Invoice ${invoice.invoiceNumber}\n\n`;

  // From section
  if (config.fromName) {
    md += `**From:** ${config.fromName}\n`;
    if (config.fromEmail) md += `**Email:** ${config.fromEmail}\n`;
    if (config.fromAddress) md += `**Address:** ${config.fromAddress}\n`;
    md += "\n";
  }

  // To section
  md += `**Bill To:** ${invoice.clientName}\n`;
  if (invoice.clientEmail) md += `**Email:** ${invoice.clientEmail}\n`;
  if (invoice.clientAddress) md += `**Address:** ${invoice.clientAddress}\n`;
  md += "\n";

  // Dates
  md += `**Issue Date:** ${formatDate(invoice.issueDate)}\n`;
  md += `**Due Date:** ${formatDate(invoice.dueDate)}\n`;
  md += `**Status:** ${invoice.status}\n\n`;

  // Items table
  md += "| Description | Qty | Unit Price | Total |\n";
  md += "|---|---|---|---|\n";
  for (const item of invoice.items) {
    md += `| ${item.description} | ${item.quantity} | ${formatCents(item.unitPrice, currency)} | ${formatCents(item.total, currency)} |\n`;
  }
  md += "\n";

  // Totals
  md += `**Subtotal:** ${formatCents(invoice.subtotal, currency)}\n`;
  if (invoice.taxRate > 0) {
    md += `**Tax (${invoice.taxRate}%):** ${formatCents(invoice.taxAmount, currency)}\n`;
  }
  md += `**Total:** ${formatCents(invoice.total, currency)}\n`;

  // Notes
  if (invoice.notes) {
    md += `\n---\n\n**Notes:** ${invoice.notes}\n`;
  }

  return md;
}

// ---------------------------------------------------------------------------
// Invoice Generator
// ---------------------------------------------------------------------------

export interface InvoiceGenerator {
  /** Create a new invoice */
  create(input: InvoiceInput): Promise<Invoice>;

  /** Get an invoice by ID */
  get(id: string): Promise<Invoice | undefined>;

  /** List all invoices */
  list(): Promise<Invoice[]>;

  /** Update invoice status */
  updateStatus(id: string, status: Invoice["status"]): Promise<Invoice>;

  /** Render invoice as markdown */
  renderMarkdown(id: string): Promise<string>;

  /** Render invoice as HTML */
  renderHtml(id: string): Promise<string>;
}

export function createInvoiceGenerator(
  config: InvoiceGeneratorConfig = {},
): InvoiceGenerator {
  const invoices = new Map<string, Invoice>();

  return {
    async create(input: InvoiceInput): Promise<Invoice> {
      const validated = InvoiceInputSchema.parse(input);
      const id = generateId("inv");
      const { items, subtotal, taxAmount, total } =
        calculateInvoiceTotals(validated);

      const invoice: Invoice = {
        id,
        invoiceNumber: generateInvoiceNumber(),
        clientName: validated.clientName,
        clientEmail: validated.clientEmail,
        clientAddress: validated.clientAddress,
        items,
        subtotal,
        taxRate: validated.taxRate ?? 0,
        taxAmount,
        total,
        currency: validated.currency ?? "USD",
        issueDate: new Date(),
        dueDate: validated.dueDate,
        status: "draft",
        notes: validated.notes,
      };

      invoices.set(id, invoice);
      return invoice;
    },

    async get(id: string): Promise<Invoice | undefined> {
      return invoices.get(id);
    },

    async list(): Promise<Invoice[]> {
      return Array.from(invoices.values()).sort(
        (a, b) => b.issueDate.getTime() - a.issueDate.getTime(),
      );
    },

    async updateStatus(
      id: string,
      status: Invoice["status"],
    ): Promise<Invoice> {
      const invoice = invoices.get(id);
      if (!invoice) {
        throw new Error(`Invoice not found: ${id}`);
      }

      const updated: Invoice = { ...invoice, status };
      invoices.set(id, updated);
      return updated;
    },

    async renderMarkdown(id: string): Promise<string> {
      const invoice = invoices.get(id);
      if (!invoice) {
        throw new Error(`Invoice not found: ${id}`);
      }

      return renderInvoiceMarkdown(invoice, config);
    },

    async renderHtml(id: string): Promise<string> {
      const markdown = await this.renderMarkdown(id);

      // Convert table first (before newlines are replaced)
      let html = markdown.replace(
        /\|(.+)\|\n\|[-|]+\|\n((?:\|.+\|\n?)+)/g,
        (_, header: string, body: string) => {
          const headers = header
            .split("|")
            .filter(Boolean)
            .map((h: string) => `<th>${h.trim()}</th>`);
          const rows = body
            .trim()
            .split("\n")
            .map((row: string) => {
              const cells = row
                .split("|")
                .filter(Boolean)
                .map((c: string) => `<td>${c.trim()}</td>`);
              return `<tr>${cells.join("")}</tr>`;
            });
          return `<table><thead><tr>${headers.join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
        },
      );

      // Simple markdown-to-HTML conversion
      html = html
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br>");

      return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice</title>
<style>
body { font-family: -apple-system, system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; }
table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
th { background: #f5f5f5; }
h1 { border-bottom: 2px solid #333; padding-bottom: 0.5rem; }
</style>
</head>
<body>
${html}
</body>
</html>`;
    },
  };
}
