/**
 * Sales — Types & Drizzle Schema
 *
 * Minimal CRM types: contacts, deals, stages, outreach sequences.
 * All monetary values are in cents (consistent with Stripe).
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Contact Stages
// ---------------------------------------------------------------------------

export const CONTACT_STAGES = [
  "lead",
  "qualified",
  "opportunity",
  "customer",
  "churned",
] as const;

export type ContactStage = (typeof CONTACT_STAGES)[number];

export const ContactStageSchema = z.enum(CONTACT_STAGES);

// ---------------------------------------------------------------------------
// Deal Stages
// ---------------------------------------------------------------------------

export const DEAL_STAGES = [
  "discovery",
  "qualification",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
] as const;

export type DealStage = (typeof DEAL_STAGES)[number];

export const DealStageSchema = z.enum(DEAL_STAGES);

// ---------------------------------------------------------------------------
// Contact
// ---------------------------------------------------------------------------

export const ContactSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  company: z.string().optional(),
  phone: z.string().optional(),
  stage: ContactStageSchema.default("lead"),
  score: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  source: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Contact = z.infer<typeof ContactSchema>;

export const ContactInputSchema = ContactSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type ContactInput = z.input<typeof ContactInputSchema>;

// ---------------------------------------------------------------------------
// Deal
// ---------------------------------------------------------------------------

export const DealSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  contactId: z.string().min(1),
  /** Value in cents */
  value: z.number().int().nonnegative(),
  stage: DealStageSchema.default("discovery"),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.date().optional(),
  notes: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

export type Deal = z.infer<typeof DealSchema>;

export const DealInputSchema = DealSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DealInput = z.input<typeof DealInputSchema>;

// ---------------------------------------------------------------------------
// BANT Qualification
// ---------------------------------------------------------------------------

export const BANTScoreSchema = z.object({
  budget: z.number().min(0).max(25),
  authority: z.number().min(0).max(25),
  need: z.number().min(0).max(25),
  timeline: z.number().min(0).max(25),
  total: z.number().min(0).max(100),
  summary: z.string(),
});

export type BANTScore = z.infer<typeof BANTScoreSchema>;

// ---------------------------------------------------------------------------
// Outreach Sequence
// ---------------------------------------------------------------------------

export const OutreachStepSchema = z.object({
  /** Delay in days from previous step (0 = immediate) */
  delayDays: z.number().int().nonnegative(),
  subject: z.string().min(1),
  /** Markdown template body, supports {{variable}} placeholders */
  body: z.string().min(1),
});

export type OutreachStep = z.infer<typeof OutreachStepSchema>;

export const OutreachSequenceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  steps: z.array(OutreachStepSchema).min(1),
  contactIds: z.array(z.string()),
  status: z.enum(["draft", "active", "paused", "completed"]).default("draft"),
  createdAt: z.date().default(() => new Date()),
});

export type OutreachSequence = z.infer<typeof OutreachSequenceSchema>;

export const OutreachSequenceInputSchema = OutreachSequenceSchema.omit({
  id: true,
  createdAt: true,
});

export type OutreachSequenceInput = z.input<typeof OutreachSequenceInputSchema>;

// ---------------------------------------------------------------------------
// Outreach Send Record
// ---------------------------------------------------------------------------

export const OutreachSendSchema = z.object({
  id: z.string().min(1),
  sequenceId: z.string().min(1),
  contactId: z.string().min(1),
  stepIndex: z.number().int().nonnegative(),
  sentAt: z.date(),
  status: z.enum([
    "sent",
    "delivered",
    "opened",
    "replied",
    "bounced",
    "failed",
  ]),
});

export type OutreachSend = z.infer<typeof OutreachSendSchema>;

// ---------------------------------------------------------------------------
// CSV Import
// ---------------------------------------------------------------------------

export const CsvImportResultSchema = z.object({
  imported: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  errors: z.array(
    z.object({
      row: z.number().int(),
      message: z.string(),
    }),
  ),
});

export type CsvImportResult = z.infer<typeof CsvImportResultSchema>;

// ---------------------------------------------------------------------------
// Sales Report
// ---------------------------------------------------------------------------

export const SalesReportSchema = z.object({
  totalContacts: z.number().int().nonnegative(),
  contactsByStage: z.record(ContactStageSchema, z.number().int().nonnegative()),
  totalDeals: z.number().int().nonnegative(),
  dealsByStage: z.record(DealStageSchema, z.number().int().nonnegative()),
  /** Total pipeline value in cents */
  pipelineValue: z.number().int().nonnegative(),
  /** Total won value in cents */
  wonValue: z.number().int().nonnegative(),
  /** Win rate percentage */
  winRate: z.number().min(0).max(100),
  generatedAt: z.date(),
});

export type SalesReport = z.infer<typeof SalesReportSchema>;

// ---------------------------------------------------------------------------
// Drizzle Schema Definitions (for consumers using Drizzle)
// ---------------------------------------------------------------------------

export interface ContactRow {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly company: string | null;
  readonly phone: string | null;
  readonly stage: ContactStage;
  readonly score: number | null;
  readonly tags: string[];
  readonly notes: string | null;
  readonly source: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface DealRow {
  readonly id: string;
  readonly title: string;
  readonly contactId: string;
  readonly value: number;
  readonly stage: DealStage;
  readonly probability: number | null;
  readonly expectedCloseDate: Date | null;
  readonly notes: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Sales Service Interface
// ---------------------------------------------------------------------------

export interface SalesService {
  // Contacts
  addContact(input: ContactInput): Promise<Contact>;
  getContact(id: string): Promise<Contact | undefined>;
  listContacts(options?: ContactListOptions): Promise<Contact[]>;
  updateContactStage(id: string, stage: ContactStage): Promise<Contact>;
  importContactsFromCsv(csvContent: string): Promise<CsvImportResult>;

  // Deals
  createDeal(input: DealInput): Promise<Deal>;
  getDeal(id: string): Promise<Deal | undefined>;
  listDeals(options?: DealListOptions): Promise<Deal[]>;
  updateDealStage(id: string, stage: DealStage): Promise<Deal>;

  // Qualification
  qualifyContact(
    id: string,
    context?: QualificationContext,
  ): Promise<BANTScore>;

  // Reports
  generateReport(): Promise<SalesReport>;
}

export interface ContactListOptions {
  stage?: ContactStage;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface DealListOptions {
  stage?: DealStage;
  contactId?: string;
  limit?: number;
  offset?: number;
}

export interface QualificationContext {
  /** Additional context about the contact for AI qualification */
  notes?: string;
  /** Company information for BANT analysis */
  companyInfo?: string;
}
