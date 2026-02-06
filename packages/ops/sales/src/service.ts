/**
 * Sales Service
 *
 * CRUD for contacts and deals. CSV import. AI qualification via BANT.
 * Stage management with transition tracking.
 */

import {
  type Contact,
  type ContactInput,
  ContactInputSchema,
  type ContactStage,
  CONTACT_STAGES,
  type ContactListOptions,
  type Deal,
  type DealInput,
  DealInputSchema,
  type DealStage,
  DEAL_STAGES,
  type DealListOptions,
  type BANTScore,
  type CsvImportResult,
  type SalesReport,
  type SalesService,
  type QualificationContext,
} from "./types.js";

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${timestamp}${random}`;
}

// ---------------------------------------------------------------------------
// In-Memory Store (replaceable with Drizzle DB adapter)
// ---------------------------------------------------------------------------

interface SalesStore {
  contacts: Map<string, Contact>;
  deals: Map<string, Deal>;
}

function createStore(): SalesStore {
  return {
    contacts: new Map(),
    deals: new Map(),
  };
}

// ---------------------------------------------------------------------------
// CSV Parsing
// ---------------------------------------------------------------------------

function parseCsvRow(headers: string[], row: string): Record<string, string> {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of row) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  const record: Record<string, string> = {};
  for (let i = 0; i < headers.length; i++) {
    const key = headers[i];
    if (key !== undefined && values[i] !== undefined) {
      record[key] = values[i];
    }
  }
  return record;
}

function parseCsv(csvContent: string): {
  headers: string[];
  rows: Record<string, string>[];
} {
  const lines = csvContent
    .trim()
    .split("\n")
    .filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0]!
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows = lines.slice(1).map((line) => parseCsvRow(headers, line));

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// BANT Qualification (Stub — real implementation uses AI provider)
// ---------------------------------------------------------------------------

function defaultQualify(
  contact: Contact,
  _context?: QualificationContext,
): BANTScore {
  // Default scoring based on available data
  let budget = 10;
  let authority = 10;
  let need = 10;
  let timeline = 10;

  if (contact.company) budget += 5;
  if (contact.phone) authority += 5;
  if (contact.notes) need += 5;
  if (contact.stage === "qualified" || contact.stage === "opportunity")
    timeline += 5;

  const total = budget + authority + need + timeline;
  const summary = `Contact ${contact.name} scored ${total}/100 on BANT qualification.`;

  return { budget, authority, need, timeline, total, summary };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface SalesServiceConfig {
  /** Optional AI qualification function */
  qualify?: (
    contact: Contact,
    context?: QualificationContext,
  ) => Promise<BANTScore>;
}

export function createSalesService(
  config: SalesServiceConfig = {},
): SalesService {
  const store = createStore();

  const qualify = config.qualify
    ? config.qualify
    : async (contact: Contact, context?: QualificationContext) =>
        defaultQualify(contact, context);

  return {
    // -------------------------------------------------------------------
    // Contacts
    // -------------------------------------------------------------------

    async addContact(input: ContactInput): Promise<Contact> {
      const validated = ContactInputSchema.parse(input);
      const id = generateId("con");
      const now = new Date();

      const contact: Contact = {
        ...validated,
        id,
        stage: validated.stage ?? "lead",
        tags: validated.tags ?? [],
        createdAt: now,
        updatedAt: now,
      };

      store.contacts.set(id, contact);
      return contact;
    },

    async getContact(id: string): Promise<Contact | undefined> {
      return store.contacts.get(id);
    },

    async listContacts(options: ContactListOptions = {}): Promise<Contact[]> {
      let contacts = Array.from(store.contacts.values());

      if (options.stage) {
        contacts = contacts.filter((c) => c.stage === options.stage);
      }

      if (options.search) {
        const term = options.search.toLowerCase();
        contacts = contacts.filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.email.toLowerCase().includes(term) ||
            (c.company && c.company.toLowerCase().includes(term)),
        );
      }

      // Sort by createdAt descending
      contacts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      if (options.offset) {
        contacts = contacts.slice(options.offset);
      }

      if (options.limit) {
        contacts = contacts.slice(0, options.limit);
      }

      return contacts;
    },

    async updateContactStage(
      id: string,
      stage: ContactStage,
    ): Promise<Contact> {
      const contact = store.contacts.get(id);
      if (!contact) {
        throw new Error(`Contact not found: ${id}`);
      }

      const updated: Contact = {
        ...contact,
        stage,
        updatedAt: new Date(),
      };

      store.contacts.set(id, updated);
      return updated;
    },

    async importContactsFromCsv(csvContent: string): Promise<CsvImportResult> {
      const { headers, rows } = parseCsv(csvContent);

      if (headers.length === 0) {
        return {
          imported: 0,
          skipped: 0,
          errors: [{ row: 0, message: "Empty CSV" }],
        };
      }

      let imported = 0;
      let skipped = 0;
      const errors: Array<{ row: number; message: string }> = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]!;
        try {
          const email = row["email"];
          const name = row["name"];

          if (!email || !name) {
            errors.push({
              row: i + 2,
              message: "Missing required fields: email, name",
            });
            skipped++;
            continue;
          }

          // Check for duplicate email
          const existing = Array.from(store.contacts.values()).find(
            (c) => c.email === email,
          );
          if (existing) {
            skipped++;
            continue;
          }

          const id = generateId("con");
          const now = new Date();
          const stage = (row["stage"] as ContactStage) || "lead";

          if (!CONTACT_STAGES.includes(stage as ContactStage)) {
            errors.push({
              row: i + 2,
              message: `Invalid stage: ${row["stage"]}`,
            });
            skipped++;
            continue;
          }

          const contact: Contact = {
            id,
            email,
            name,
            company: row["company"] || undefined,
            phone: row["phone"] || undefined,
            stage: stage as ContactStage,
            score: undefined,
            tags: row["tags"]
              ? row["tags"].split(";").map((t) => t.trim())
              : [],
            notes: row["notes"] || undefined,
            source: "csv-import",
            createdAt: now,
            updatedAt: now,
          };

          store.contacts.set(id, contact);
          imported++;
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          errors.push({ row: i + 2, message });
          skipped++;
        }
      }

      return { imported, skipped, errors };
    },

    // -------------------------------------------------------------------
    // Deals
    // -------------------------------------------------------------------

    async createDeal(input: DealInput): Promise<Deal> {
      const validated = DealInputSchema.parse(input);
      const id = generateId("deal");
      const now = new Date();

      const deal: Deal = {
        ...validated,
        id,
        stage: validated.stage ?? "discovery",
        createdAt: now,
        updatedAt: now,
      };

      store.deals.set(id, deal);
      return deal;
    },

    async getDeal(id: string): Promise<Deal | undefined> {
      return store.deals.get(id);
    },

    async listDeals(options: DealListOptions = {}): Promise<Deal[]> {
      let deals = Array.from(store.deals.values());

      if (options.stage) {
        deals = deals.filter((d) => d.stage === options.stage);
      }

      if (options.contactId) {
        deals = deals.filter((d) => d.contactId === options.contactId);
      }

      // Sort by createdAt descending
      deals.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      if (options.offset) {
        deals = deals.slice(options.offset);
      }

      if (options.limit) {
        deals = deals.slice(0, options.limit);
      }

      return deals;
    },

    async updateDealStage(id: string, stage: DealStage): Promise<Deal> {
      const deal = store.deals.get(id);
      if (!deal) {
        throw new Error(`Deal not found: ${id}`);
      }

      // Set probability based on stage
      const stageProbability: Record<DealStage, number> = {
        discovery: 10,
        qualification: 25,
        proposal: 50,
        negotiation: 75,
        closed_won: 100,
        closed_lost: 0,
      };

      const updated: Deal = {
        ...deal,
        stage,
        probability: stageProbability[stage],
        updatedAt: new Date(),
      };

      store.deals.set(id, updated);
      return updated;
    },

    // -------------------------------------------------------------------
    // Qualification
    // -------------------------------------------------------------------

    async qualifyContact(
      id: string,
      context?: QualificationContext,
    ): Promise<BANTScore> {
      const contact = store.contacts.get(id);
      if (!contact) {
        throw new Error(`Contact not found: ${id}`);
      }

      const score = await qualify(contact, context);

      // Update contact score
      const updated: Contact = {
        ...contact,
        score: score.total,
        updatedAt: new Date(),
      };
      store.contacts.set(id, updated);

      return score;
    },

    // -------------------------------------------------------------------
    // Reports
    // -------------------------------------------------------------------

    async generateReport(): Promise<SalesReport> {
      const contacts = Array.from(store.contacts.values());
      const deals = Array.from(store.deals.values());

      const contactsByStage = {} as Record<ContactStage, number>;
      for (const stage of CONTACT_STAGES) {
        contactsByStage[stage] = contacts.filter(
          (c) => c.stage === stage,
        ).length;
      }

      const dealsByStage = {} as Record<DealStage, number>;
      for (const stage of DEAL_STAGES) {
        dealsByStage[stage] = deals.filter((d) => d.stage === stage).length;
      }

      const openDeals = deals.filter(
        (d) => d.stage !== "closed_won" && d.stage !== "closed_lost",
      );
      const pipelineValue = openDeals.reduce((sum, d) => sum + d.value, 0);

      const wonDeals = deals.filter((d) => d.stage === "closed_won");
      const wonValue = wonDeals.reduce((sum, d) => sum + d.value, 0);

      const closedDeals = deals.filter(
        (d) => d.stage === "closed_won" || d.stage === "closed_lost",
      );
      const winRate =
        closedDeals.length > 0
          ? (wonDeals.length / closedDeals.length) * 100
          : 0;

      return {
        totalContacts: contacts.length,
        contactsByStage,
        totalDeals: deals.length,
        dealsByStage,
        pipelineValue,
        wonValue,
        winRate,
        generatedAt: new Date(),
      };
    },
  };
}
