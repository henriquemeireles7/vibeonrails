/**
 * @vibeonrails/sales — Barrel Exports
 *
 * Minimal CRM: contacts, deals, AI qualification, and outreach sequences.
 */

// Types
export type {
  Contact,
  ContactInput,
  ContactStage,
  ContactRow,
  ContactListOptions,
  Deal,
  DealInput,
  DealStage,
  DealRow,
  DealListOptions,
  BANTScore,
  OutreachSequence,
  OutreachSequenceInput,
  OutreachStep,
  OutreachSend,
  CsvImportResult,
  SalesReport,
  SalesService,
  QualificationContext,
} from "./types.js";

export {
  ContactSchema,
  ContactInputSchema,
  ContactStageSchema,
  CONTACT_STAGES,
  DealSchema,
  DealInputSchema,
  DealStageSchema,
  DEAL_STAGES,
  BANTScoreSchema,
  OutreachSequenceSchema,
  OutreachSequenceInputSchema,
  OutreachStepSchema,
  OutreachSendSchema,
  CsvImportResultSchema,
  SalesReportSchema,
} from "./types.js";

// Service
export { createSalesService } from "./service.js";
export type { SalesServiceConfig } from "./service.js";

// Outreach
export { createOutreachEngine } from "./outreach.js";
export type {
  OutreachEngine,
  OutreachEngineConfig,
  ScheduledSend,
} from "./outreach.js";

// CLI
export { createSalesCli } from "./cli.js";
export type { SalesCli, SalesCliConfig, CliOutput } from "./cli.js";
