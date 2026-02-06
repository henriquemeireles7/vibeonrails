/**
 * Channels — Barrel Export
 *
 * Post content via platform APIs, manage drafts/posted lifecycle.
 */

// Types
export type {
  DraftMetadata,
  PostedMetadata,
  PostResult,
  ChannelConfig,
  ChannelPostFunction,
  ChannelRegistry,
  ScheduleEntry,
  ChannelStats,
} from "./types.js";

export {
  DraftMetadataSchema,
  PostedMetadataSchema,
  ScheduleEntrySchema,
} from "./types.js";

// Engine
export {
  createChannelRegistry,
  readDraft,
  listDrafts,
  listPosted,
  postContent,
  postOldestDraft,
  autopilot,
  getChannelStats,
} from "./engine.js";

// CLI
export {
  resolveChannelPaths,
  executePost,
  executeAutopilot,
  executeDraftsList,
  executePostedList,
  executeStats,
  formatDraftsList,
  formatPostedList,
  formatStats,
} from "./cli.js";
export type {
  PostCommandOptions,
  AutopilotCommandOptions,
  DraftsListItem,
  PostedListItem,
} from "./cli.js";
