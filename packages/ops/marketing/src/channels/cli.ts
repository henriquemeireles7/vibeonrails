/**
 * Channels — CLI Commands
 *
 * Implements `npx vibe marketing post`, `npx vibe marketing autopilot`,
 * `npx vibe marketing schedule`, `npx vibe marketing drafts`,
 * `npx vibe marketing posted`, `npx vibe marketing stats`.
 */

import { join } from "node:path";
import {
  listDrafts,
  listPosted,
  postContent,
  postOldestDraft,
  autopilot,
  getChannelStats,
} from "./engine.js";
import type { ChannelPostFunction, PostResult, ChannelStats } from "./types.js";
import type { SupportedChannel } from "../transform/types.js";
import { SUPPORTED_CHANNELS } from "../transform/types.js";

// ---------------------------------------------------------------------------
// Content Path Resolver
// ---------------------------------------------------------------------------

/**
 * Resolve channel content directories from project root.
 */
export function resolveChannelPaths(
  projectRoot: string,
  channel: SupportedChannel,
): {
  draftsDir: string;
  postedDir: string;
} {
  return {
    draftsDir: join(
      projectRoot,
      "content",
      "marketing",
      "channels",
      channel,
      "drafts",
    ),
    postedDir: join(
      projectRoot,
      "content",
      "marketing",
      "channels",
      channel,
      "posted",
    ),
  };
}

// ---------------------------------------------------------------------------
// Post Command
// ---------------------------------------------------------------------------

export interface PostCommandOptions {
  /** Target channel */
  channel: SupportedChannel;

  /** Specific file to post (optional, posts oldest draft if omitted) */
  file?: string;

  /** Project root */
  projectRoot: string;

  /** Channel post function */
  poster: ChannelPostFunction;
}

/**
 * Execute the post command.
 */
export async function executePost(
  options: PostCommandOptions,
): Promise<PostResult | null> {
  const { channel, file, projectRoot, poster } = options;
  const { draftsDir, postedDir } = resolveChannelPaths(projectRoot, channel);

  if (file) {
    return postContent(file, poster, postedDir);
  }

  return postOldestDraft(draftsDir, poster, postedDir);
}

// ---------------------------------------------------------------------------
// Autopilot Command
// ---------------------------------------------------------------------------

export interface AutopilotCommandOptions {
  /** Target channel */
  channel: SupportedChannel;

  /** Number of posts to make */
  count: number;

  /** Interval between posts in milliseconds */
  intervalMs: number;

  /** Project root */
  projectRoot: string;

  /** Channel post function */
  poster: ChannelPostFunction;
}

/**
 * Execute the autopilot command.
 */
export async function executeAutopilot(
  options: AutopilotCommandOptions,
): Promise<PostResult[]> {
  const { channel, count, intervalMs, projectRoot, poster } = options;
  const { draftsDir, postedDir } = resolveChannelPaths(projectRoot, channel);

  return autopilot(draftsDir, poster, postedDir, { count, intervalMs });
}

// ---------------------------------------------------------------------------
// Drafts Command
// ---------------------------------------------------------------------------

export interface DraftsListItem {
  filename: string;
  channel: string;
  generatedAt: string;
  topic: string | undefined;
  preview: string;
}

/**
 * Execute the drafts list command.
 */
export async function executeDraftsList(
  projectRoot: string,
  channel?: SupportedChannel,
): Promise<DraftsListItem[]> {
  const channels = channel ? [channel] : SUPPORTED_CHANNELS;
  const items: DraftsListItem[] = [];

  for (const ch of channels) {
    const { draftsDir } = resolveChannelPaths(projectRoot, ch);
    const drafts = await listDrafts(draftsDir);

    for (const draft of drafts) {
      const filename = draft.filePath.split("/").pop() ?? "";
      items.push({
        filename,
        channel: draft.metadata.channel,
        generatedAt: draft.metadata.generatedAt,
        topic: draft.metadata.topic,
        preview: draft.content.slice(0, 80),
      });
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// Posted Command
// ---------------------------------------------------------------------------

export interface PostedListItem {
  filename: string;
  channel: string;
  postedAt: string;
  postUrl: string | undefined;
  preview: string;
}

/**
 * Execute the posted list command.
 */
export async function executePostedList(
  projectRoot: string,
  channel?: SupportedChannel,
): Promise<PostedListItem[]> {
  const channels = channel ? [channel] : SUPPORTED_CHANNELS;
  const items: PostedListItem[] = [];

  for (const ch of channels) {
    const { postedDir } = resolveChannelPaths(projectRoot, ch);
    const posted = await listPosted(postedDir);

    for (const post of posted) {
      const filename = post.filePath.split("/").pop() ?? "";
      items.push({
        filename,
        channel: post.metadata.channel,
        postedAt: post.metadata.postedAt,
        postUrl: post.metadata.postUrl,
        preview: post.content.slice(0, 80),
      });
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// Stats Command
// ---------------------------------------------------------------------------

/**
 * Execute the stats command.
 */
export async function executeStats(
  projectRoot: string,
  channel?: SupportedChannel,
): Promise<ChannelStats[]> {
  const channels = channel ? [channel] : SUPPORTED_CHANNELS;
  const stats: ChannelStats[] = [];

  for (const ch of channels) {
    const { draftsDir, postedDir } = resolveChannelPaths(projectRoot, ch);
    const channelStats = await getChannelStats(ch, draftsDir, postedDir);
    stats.push(channelStats);
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Format Helpers
// ---------------------------------------------------------------------------

/**
 * Format drafts list for CLI output.
 */
export function formatDraftsList(items: DraftsListItem[]): string {
  if (items.length === 0) {
    return "No drafts found.";
  }

  const lines: string[] = [""];
  for (const item of items) {
    const topic = item.topic ? ` (${item.topic})` : "";
    lines.push(`  [${item.channel}] ${item.filename}${topic}`);
    lines.push(`    Generated: ${item.generatedAt}`);
    lines.push(`    Preview: ${item.preview}...`);
    lines.push("");
  }

  lines.push(`  Total: ${items.length} draft(s)`);
  return lines.join("\n");
}

/**
 * Format posted list for CLI output.
 */
export function formatPostedList(items: PostedListItem[]): string {
  if (items.length === 0) {
    return "No posted content found.";
  }

  const lines: string[] = [""];
  for (const item of items) {
    const url = item.postUrl ? ` -> ${item.postUrl}` : "";
    lines.push(`  [${item.channel}] ${item.filename}${url}`);
    lines.push(`    Posted: ${item.postedAt}`);
    lines.push(`    Preview: ${item.preview}...`);
    lines.push("");
  }

  lines.push(`  Total: ${items.length} post(s)`);
  return lines.join("\n");
}

/**
 * Format stats for CLI output.
 */
export function formatStats(stats: ChannelStats[]): string {
  if (stats.length === 0) {
    return "No channel stats available.";
  }

  const lines: string[] = [""];
  for (const s of stats) {
    lines.push(`  ${s.channel.toUpperCase()}:`);
    lines.push(`    Drafts: ${s.draftsCount}`);
    lines.push(`    Posted: ${s.postedCount}`);
    lines.push(`    This week: ${s.postsThisWeek}`);
    lines.push(`    This month: ${s.postsThisMonth}`);
    if (s.lastPostedAt) {
      lines.push(`    Last posted: ${s.lastPostedAt}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
