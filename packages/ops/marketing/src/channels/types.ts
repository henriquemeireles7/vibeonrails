/**
 * Channels — Types
 *
 * Defines Channel, PostResult, DraftMetadata, PostedMetadata types
 * for the marketing channel posting engine.
 */

import { z } from "zod";
import type { SupportedChannel } from "../transform/types.js";

// ---------------------------------------------------------------------------
// Draft Metadata (frontmatter of generated content)
// ---------------------------------------------------------------------------

export const DraftMetadataSchema = z.object({
  /** Generation timestamp */
  generatedAt: z.string(),

  /** Target channel */
  channel: z.string(),

  /** Git hashes of heuristics used in generation */
  heuristicHashes: z.record(z.string(), z.string()).default({}),

  /** Topic used for generation */
  topic: z.string().optional(),

  /** Current status */
  status: z.literal("draft"),
});

export type DraftMetadata = z.infer<typeof DraftMetadataSchema>;

// ---------------------------------------------------------------------------
// Posted Metadata (frontmatter after posting)
// ---------------------------------------------------------------------------

export const PostedMetadataSchema = z.object({
  /** Generation timestamp */
  generatedAt: z.string(),

  /** Target channel */
  channel: z.string(),

  /** Git hashes of heuristics used */
  heuristicHashes: z.record(z.string(), z.string()).default({}),

  /** Topic used for generation */
  topic: z.string().optional(),

  /** Status after posting */
  status: z.literal("posted"),

  /** Posting timestamp */
  postedAt: z.string(),

  /** URL of the published post */
  postUrl: z.string().optional(),

  /** Platform-specific post ID */
  postId: z.string().optional(),

  /** Platform-specific metadata */
  platformData: z.record(z.string(), z.unknown()).default({}),
});

export type PostedMetadata = z.infer<typeof PostedMetadataSchema>;

// ---------------------------------------------------------------------------
// Post Result
// ---------------------------------------------------------------------------

export interface PostResult {
  /** Whether the post was successful */
  success: boolean;

  /** Platform-specific post ID */
  postId?: string;

  /** URL of the published post */
  postUrl?: string;

  /** Error message if failed */
  error?: string;

  /** Timestamp of posting */
  postedAt: string;

  /** Platform-specific response data */
  platformData?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Channel Configuration
// ---------------------------------------------------------------------------

export interface ChannelConfig {
  /** Channel name */
  name: SupportedChannel;

  /** Whether this channel is enabled */
  enabled: boolean;

  /** Base directory for this channel's content */
  contentDir: string;

  /** Drafts subdirectory */
  draftsDir: string;

  /** Posted subdirectory */
  postedDir: string;

  /** Whether autopilot is enabled for this channel */
  autopilot: boolean;
}

// ---------------------------------------------------------------------------
// Channel Post Function Interface
// ---------------------------------------------------------------------------

export type ChannelPostFunction = (
  content: string,
  metadata: DraftMetadata,
) => Promise<PostResult>;

// ---------------------------------------------------------------------------
// Channel Registry
// ---------------------------------------------------------------------------

export interface ChannelRegistry {
  /** Register a channel poster */
  register(channel: SupportedChannel, poster: ChannelPostFunction): void;

  /** Get a registered channel poster */
  get(channel: SupportedChannel): ChannelPostFunction | undefined;

  /** List registered channels */
  list(): SupportedChannel[];
}

// ---------------------------------------------------------------------------
// Schedule Entry
// ---------------------------------------------------------------------------

export const ScheduleEntrySchema = z.object({
  /** Draft file path */
  filePath: z.string(),

  /** Channel to post to */
  channel: z.string(),

  /** Scheduled posting time (ISO string) */
  scheduledAt: z.string(),

  /** Whether this has been posted */
  posted: z.boolean().default(false),
});

export type ScheduleEntry = z.infer<typeof ScheduleEntrySchema>;

// ---------------------------------------------------------------------------
// Channel Stats
// ---------------------------------------------------------------------------

export interface ChannelStats {
  /** Channel name */
  channel: string;

  /** Number of pending drafts */
  draftsCount: number;

  /** Number of posted items */
  postedCount: number;

  /** Last posted timestamp */
  lastPostedAt: string | null;

  /** Total posts this week */
  postsThisWeek: number;

  /** Total posts this month */
  postsThisMonth: number;
}
