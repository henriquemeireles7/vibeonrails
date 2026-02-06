/**
 * Channels — Engine
 *
 * Post content via platform APIs (Twitter, Bluesky).
 * Manages the drafts -> posted file lifecycle.
 * Adds posting metadata to frontmatter.
 */

import {
  readFile,
  writeFile,
  readdir,
  rename,
  mkdir,
  stat,
} from "node:fs/promises";
import { join, basename, extname } from "node:path";
import { parseFrontmatter } from "../heuristics/loader.js";
import {
  DraftMetadataSchema,
  type DraftMetadata,
  type PostedMetadata,
  type PostResult,
  type ChannelPostFunction,
  type ChannelRegistry,
  type ChannelStats,
} from "./types.js";
import type { SupportedChannel } from "../transform/types.js";

// ---------------------------------------------------------------------------
// Channel Registry
// ---------------------------------------------------------------------------

/**
 * Create a channel registry for registering and retrieving post functions.
 */
export function createChannelRegistry(): ChannelRegistry {
  const channels = new Map<SupportedChannel, ChannelPostFunction>();

  return {
    register(channel: SupportedChannel, poster: ChannelPostFunction): void {
      channels.set(channel, poster);
    },

    get(channel: SupportedChannel): ChannelPostFunction | undefined {
      return channels.get(channel);
    },

    list(): SupportedChannel[] {
      return Array.from(channels.keys());
    },
  };
}

// ---------------------------------------------------------------------------
// Draft Reader
// ---------------------------------------------------------------------------

/**
 * Read a draft file and parse its metadata.
 */
export async function readDraft(
  filePath: string,
): Promise<{
  metadata: DraftMetadata;
  content: string;
  rawContent: string;
} | null> {
  try {
    const raw = await readFile(filePath, "utf-8");
    const { data, body } = parseFrontmatter(raw);

    const result = DraftMetadataSchema.safeParse(data);
    if (!result.success) {
      return null;
    }

    return {
      metadata: result.data,
      content: body.trim(),
      rawContent: raw,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Draft Listing
// ---------------------------------------------------------------------------

/**
 * List all draft files in a directory.
 */
export async function listDrafts(
  draftsDir: string,
): Promise<
  Array<{ filePath: string; metadata: DraftMetadata; content: string }>
> {
  const drafts: Array<{
    filePath: string;
    metadata: DraftMetadata;
    content: string;
  }> = [];

  try {
    const entries = await readdir(draftsDir);

    for (const entry of entries) {
      if (extname(entry) !== ".md") continue;

      const filePath = join(draftsDir, entry);
      const draft = await readDraft(filePath);

      if (draft) {
        drafts.push({
          filePath,
          metadata: draft.metadata,
          content: draft.content,
        });
      }
    }
  } catch {
    // Directory doesn't exist
  }

  // Sort by generatedAt (oldest first for FIFO posting)
  drafts.sort((a, b) =>
    a.metadata.generatedAt.localeCompare(b.metadata.generatedAt),
  );

  return drafts;
}

// ---------------------------------------------------------------------------
// Posted Listing
// ---------------------------------------------------------------------------

/**
 * List all posted files in a directory.
 */
export async function listPosted(
  postedDir: string,
): Promise<
  Array<{ filePath: string; metadata: PostedMetadata; content: string }>
> {
  const posted: Array<{
    filePath: string;
    metadata: PostedMetadata;
    content: string;
  }> = [];

  try {
    const entries = await readdir(postedDir);

    for (const entry of entries) {
      if (extname(entry) !== ".md") continue;

      const filePath = join(postedDir, entry);
      const raw = await readFile(filePath, "utf-8");
      const { data, body } = parseFrontmatter(raw);

      if (data.status === "posted") {
        posted.push({
          filePath,
          metadata: data as PostedMetadata,
          content: body.trim(),
        });
      }
    }
  } catch {
    // Directory doesn't exist
  }

  // Sort by postedAt (most recent first)
  posted.sort((a, b) => {
    const aDate = a.metadata.postedAt ?? "";
    const bDate = b.metadata.postedAt ?? "";
    return bDate.localeCompare(aDate);
  });

  return posted;
}

// ---------------------------------------------------------------------------
// Post Content
// ---------------------------------------------------------------------------

/**
 * Post a draft file via the channel's post function.
 * Moves the file from drafts/ to posted/ with updated metadata.
 */
export async function postContent(
  filePath: string,
  poster: ChannelPostFunction,
  postedDir: string,
): Promise<PostResult> {
  const draft = await readDraft(filePath);
  if (!draft) {
    return {
      success: false,
      error: `Cannot read draft file: ${filePath}`,
      postedAt: new Date().toISOString(),
    };
  }

  // Post via the channel function
  const result = await poster(draft.content, draft.metadata);

  if (!result.success) {
    return result;
  }

  // Build posted metadata
  const postedMetadata: PostedMetadata = {
    ...draft.metadata,
    status: "posted",
    postedAt: result.postedAt,
    postUrl: result.postUrl,
    postId: result.postId,
    platformData: result.platformData ?? {},
  };

  // Build new file content with updated frontmatter
  const newContent = buildPostedFileContent(postedMetadata, draft.content);

  // Write to posted directory
  await mkdir(postedDir, { recursive: true });
  const postedFilePath = join(postedDir, basename(filePath));
  await writeFile(postedFilePath, newContent, "utf-8");

  // Remove from drafts (by overwriting with rename)
  try {
    const { unlink } = await import("node:fs/promises");
    await unlink(filePath);
  } catch {
    // File already moved or doesn't exist
  }

  return result;
}

/**
 * Post the oldest draft in a channel's drafts directory.
 */
export async function postOldestDraft(
  draftsDir: string,
  poster: ChannelPostFunction,
  postedDir: string,
): Promise<PostResult | null> {
  const drafts = await listDrafts(draftsDir);

  if (drafts.length === 0) {
    return null;
  }

  // Post the oldest draft (first in sorted list)
  const oldest = drafts[0]!;
  return postContent(oldest.filePath, poster, postedDir);
}

// ---------------------------------------------------------------------------
// Autopilot
// ---------------------------------------------------------------------------

/**
 * Generate and post content without review.
 * Posts multiple drafts with optional interval.
 */
export async function autopilot(
  draftsDir: string,
  poster: ChannelPostFunction,
  postedDir: string,
  options: { count?: number; intervalMs?: number } = {},
): Promise<PostResult[]> {
  const { count = 1, intervalMs = 0 } = options;
  const results: PostResult[] = [];

  for (let i = 0; i < count; i++) {
    const result = await postOldestDraft(draftsDir, poster, postedDir);

    if (!result) {
      break; // No more drafts
    }

    results.push(result);

    // Wait between posts if interval specified
    if (intervalMs > 0 && i < count - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Channel Stats
// ---------------------------------------------------------------------------

/**
 * Get statistics for a channel.
 */
export async function getChannelStats(
  channel: string,
  draftsDir: string,
  postedDir: string,
): Promise<ChannelStats> {
  const drafts = await listDrafts(draftsDir);
  const posted = await listPosted(postedDir);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const postsThisWeek = posted.filter((p) => {
    const postedDate = new Date(p.metadata.postedAt);
    return postedDate >= weekAgo;
  }).length;

  const postsThisMonth = posted.filter((p) => {
    const postedDate = new Date(p.metadata.postedAt);
    return postedDate >= monthAgo;
  }).length;

  const lastPosted = posted.length > 0 ? posted[0]!.metadata.postedAt : null;

  return {
    channel,
    draftsCount: drafts.length,
    postedCount: posted.length,
    lastPostedAt: lastPosted,
    postsThisWeek,
    postsThisMonth,
  };
}

// ---------------------------------------------------------------------------
// File Content Builder
// ---------------------------------------------------------------------------

/**
 * Build file content with posted metadata frontmatter.
 */
function buildPostedFileContent(
  metadata: PostedMetadata,
  content: string,
): string {
  const lines = [
    "---",
    `generatedAt: "${metadata.generatedAt}"`,
    `channel: "${metadata.channel}"`,
    `status: "posted"`,
    `postedAt: "${metadata.postedAt}"`,
  ];

  if (metadata.postUrl) {
    lines.push(`postUrl: "${metadata.postUrl}"`);
  }

  if (metadata.postId) {
    lines.push(`postId: "${metadata.postId}"`);
  }

  if (metadata.topic) {
    lines.push(`topic: "${metadata.topic}"`);
  }

  if (Object.keys(metadata.heuristicHashes).length > 0) {
    lines.push("heuristicHashes:");
    for (const [key, hash] of Object.entries(metadata.heuristicHashes)) {
      lines.push(`  ${key}: "${hash}"`);
    }
  }

  if (Object.keys(metadata.platformData).length > 0) {
    lines.push("platformData:");
    for (const [key, value] of Object.entries(metadata.platformData)) {
      lines.push(`  ${key}: "${String(value)}"`);
    }
  }

  lines.push("---");
  lines.push("");

  return lines.join("\n") + content;
}
