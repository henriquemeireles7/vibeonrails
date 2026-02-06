/**
 * Sales Outreach
 *
 * Cold email sequences with personalization from marketing heuristics.
 * Template-based email generation with variable substitution.
 */

import {
  type OutreachSequence,
  type OutreachSequenceInput,
  OutreachSequenceInputSchema,
  type OutreachSend,
  type Contact,
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
// Template Rendering
// ---------------------------------------------------------------------------

interface TemplateVariables {
  readonly name: string;
  readonly email: string;
  readonly company: string;
  readonly [key: string]: string;
}

function buildVariables(
  contact: Contact,
  extra?: Record<string, string>,
): TemplateVariables {
  return {
    name: contact.name,
    email: contact.email,
    company: contact.company ?? "your company",
    ...extra,
  };
}

function renderTemplate(
  template: string,
  variables: TemplateVariables,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

// ---------------------------------------------------------------------------
// Schedule Calculator
// ---------------------------------------------------------------------------

export interface ScheduledSend {
  readonly contactId: string;
  readonly stepIndex: number;
  readonly scheduledDate: Date;
  readonly subject: string;
  readonly body: string;
}

function calculateSchedule(
  sequence: OutreachSequence,
  contacts: Contact[],
  startDate: Date = new Date(),
): ScheduledSend[] {
  const scheduled: ScheduledSend[] = [];

  for (const contact of contacts) {
    const variables = buildVariables(contact);
    let currentDate = new Date(startDate);

    for (let i = 0; i < sequence.steps.length; i++) {
      const step = sequence.steps[i]!;
      currentDate = new Date(
        currentDate.getTime() + step.delayDays * 24 * 60 * 60 * 1000,
      );

      scheduled.push({
        contactId: contact.id,
        stepIndex: i,
        scheduledDate: new Date(currentDate),
        subject: renderTemplate(step.subject, variables),
        body: renderTemplate(step.body, variables),
      });
    }
  }

  return scheduled.sort(
    (a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime(),
  );
}

// ---------------------------------------------------------------------------
// Outreach Engine
// ---------------------------------------------------------------------------

export interface OutreachEngine {
  /** Create a new outreach sequence */
  createSequence(input: OutreachSequenceInput): Promise<OutreachSequence>;

  /** Get a sequence by ID */
  getSequence(id: string): Promise<OutreachSequence | undefined>;

  /** List all sequences */
  listSequences(): Promise<OutreachSequence[]>;

  /** Calculate the send schedule for a sequence */
  getSchedule(
    sequenceId: string,
    contacts: Contact[],
    startDate?: Date,
  ): Promise<ScheduledSend[]>;

  /** Record a send event */
  recordSend(send: Omit<OutreachSend, "id">): Promise<OutreachSend>;

  /** Get send history for a sequence */
  getSendHistory(sequenceId: string): Promise<OutreachSend[]>;

  /** Personalize a template with contact data and optional extra variables */
  personalize(
    template: string,
    contact: Contact,
    extra?: Record<string, string>,
  ): string;
}

export interface OutreachEngineConfig {
  /** Default extra template variables (e.g., product name, sender name) */
  defaultVariables?: Record<string, string>;
}

export function createOutreachEngine(
  config: OutreachEngineConfig = {},
): OutreachEngine {
  const sequences = new Map<string, OutreachSequence>();
  const sends: OutreachSend[] = [];

  return {
    async createSequence(
      input: OutreachSequenceInput,
    ): Promise<OutreachSequence> {
      const validated = OutreachSequenceInputSchema.parse(input);
      const id = generateId("seq");

      const sequence: OutreachSequence = {
        ...validated,
        id,
        status: validated.status ?? "draft",
        createdAt: new Date(),
      };

      sequences.set(id, sequence);
      return sequence;
    },

    async getSequence(id: string): Promise<OutreachSequence | undefined> {
      return sequences.get(id);
    },

    async listSequences(): Promise<OutreachSequence[]> {
      return Array.from(sequences.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      );
    },

    async getSchedule(
      sequenceId: string,
      contacts: Contact[],
      startDate?: Date,
    ): Promise<ScheduledSend[]> {
      const sequence = sequences.get(sequenceId);
      if (!sequence) {
        throw new Error(`Sequence not found: ${sequenceId}`);
      }

      return calculateSchedule(sequence, contacts, startDate);
    },

    async recordSend(send: Omit<OutreachSend, "id">): Promise<OutreachSend> {
      const record: OutreachSend = {
        ...send,
        id: generateId("send"),
      };
      sends.push(record);
      return record;
    },

    async getSendHistory(sequenceId: string): Promise<OutreachSend[]> {
      return sends
        .filter((s) => s.sequenceId === sequenceId)
        .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
    },

    personalize(
      template: string,
      contact: Contact,
      extra?: Record<string, string>,
    ): string {
      const variables = buildVariables(contact, {
        ...config.defaultVariables,
        ...extra,
      });
      return renderTemplate(template, variables);
    },
  };
}
