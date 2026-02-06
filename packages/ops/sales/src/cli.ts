/**
 * Sales CLI Commands
 *
 * Implements `npx vibe sales` commands:
 * - contacts list/add/import
 * - deals list/create
 * - outreach create
 * - report
 */

import type { SalesService, ContactStage, DealStage } from "./types.js";
import type { OutreachEngine } from "./outreach.js";

// ---------------------------------------------------------------------------
// CLI Output Interface (abstract for testing)
// ---------------------------------------------------------------------------

export interface CliOutput {
  log(message: string): void;
  error(message: string): void;
  table(data: Record<string, unknown>[]): void;
}

function defaultOutput(): CliOutput {
  return {
    log: (msg) => process.stdout.write(`${msg}\n`),
    error: (msg) => process.stderr.write(`${msg}\n`),
    table: (data) => {
      if (data.length === 0) {
        process.stdout.write("No data.\n");
        return;
      }
      // Simple table output
      const keys = Object.keys(data[0]!);
      const header = keys.join("\t");
      process.stdout.write(`${header}\n`);
      for (const row of data) {
        const values = keys.map((k) => String(row[k] ?? ""));
        process.stdout.write(`${values.join("\t")}\n`);
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Format Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// CLI Handler
// ---------------------------------------------------------------------------

export interface SalesCliConfig {
  service: SalesService;
  outreach: OutreachEngine;
  output?: CliOutput;
}

export interface SalesCli {
  contactsList(options?: {
    stage?: ContactStage;
    search?: string;
  }): Promise<void>;
  contactsAdd(input: {
    email: string;
    name: string;
    company?: string;
    stage?: ContactStage;
  }): Promise<void>;
  contactsImport(csvContent: string): Promise<void>;
  dealsList(options?: { stage?: DealStage; contactId?: string }): Promise<void>;
  dealsCreate(input: {
    title: string;
    contactId: string;
    value: number;
    stage?: DealStage;
  }): Promise<void>;
  outreachCreate(input: {
    name: string;
    contactIds: string[];
    steps: Array<{ delayDays: number; subject: string; body: string }>;
  }): Promise<void>;
  report(): Promise<void>;
}

export function createSalesCli(config: SalesCliConfig): SalesCli {
  const { service, outreach } = config;
  const out = config.output ?? defaultOutput();

  return {
    async contactsList(options = {}): Promise<void> {
      const contacts = await service.listContacts(options);

      if (contacts.length === 0) {
        out.log("No contacts found.");
        return;
      }

      out.table(
        contacts.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.email,
          company: c.company ?? "-",
          stage: c.stage,
          score: c.score ?? "-",
        })),
      );

      out.log(`\n${contacts.length} contact(s) total.`);
    },

    async contactsAdd(input): Promise<void> {
      const contact = await service.addContact(input);
      out.log(`Contact created: ${contact.id}`);
      out.log(`  Name: ${contact.name}`);
      out.log(`  Email: ${contact.email}`);
      out.log(`  Stage: ${contact.stage}`);
    },

    async contactsImport(csvContent: string): Promise<void> {
      const result = await service.importContactsFromCsv(csvContent);

      out.log(`Import complete:`);
      out.log(`  Imported: ${result.imported}`);
      out.log(`  Skipped: ${result.skipped}`);

      if (result.errors.length > 0) {
        out.log(`  Errors:`);
        for (const err of result.errors) {
          out.error(`    Row ${err.row}: ${err.message}`);
        }
      }
    },

    async dealsList(options = {}): Promise<void> {
      const deals = await service.listDeals(options);

      if (deals.length === 0) {
        out.log("No deals found.");
        return;
      }

      out.table(
        deals.map((d) => ({
          id: d.id,
          title: d.title,
          value: formatCents(d.value),
          stage: d.stage,
          probability: d.probability !== undefined ? `${d.probability}%` : "-",
        })),
      );

      out.log(`\n${deals.length} deal(s) total.`);
    },

    async dealsCreate(input): Promise<void> {
      const deal = await service.createDeal(input);
      out.log(`Deal created: ${deal.id}`);
      out.log(`  Title: ${deal.title}`);
      out.log(`  Value: ${formatCents(deal.value)}`);
      out.log(`  Stage: ${deal.stage}`);
    },

    async outreachCreate(input): Promise<void> {
      const sequence = await outreach.createSequence(input);
      out.log(`Outreach sequence created: ${sequence.id}`);
      out.log(`  Name: ${sequence.name}`);
      out.log(`  Steps: ${sequence.steps.length}`);
      out.log(`  Contacts: ${sequence.contactIds.length}`);
      out.log(`  Status: ${sequence.status}`);
    },

    async report(): Promise<void> {
      const report = await service.generateReport();

      out.log("=== Sales Report ===");
      out.log("");
      out.log(`Contacts: ${report.totalContacts}`);
      for (const [stage, count] of Object.entries(report.contactsByStage)) {
        if (count > 0) {
          out.log(`  ${stage}: ${count}`);
        }
      }

      out.log("");
      out.log(`Deals: ${report.totalDeals}`);
      for (const [stage, count] of Object.entries(report.dealsByStage)) {
        if (count > 0) {
          out.log(`  ${stage}: ${count}`);
        }
      }

      out.log("");
      out.log(`Pipeline Value: ${formatCents(report.pipelineValue)}`);
      out.log(`Won Value: ${formatCents(report.wonValue)}`);
      out.log(`Win Rate: ${report.winRate.toFixed(1)}%`);
    },
  };
}
