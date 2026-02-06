/**
 * Channels — Engine Tests
 *
 * Tests posting, file movement, metadata addition, autopilot mode, and stats.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  mkdtemp,
  writeFile,
  mkdir,
  rm,
  readFile,
  readdir,
} from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  createChannelRegistry,
  readDraft,
  listDrafts,
  listPosted,
  postContent,
  postOldestDraft,
  autopilot,
  getChannelStats,
} from "./engine.js";
import type { PostResult, ChannelPostFunction } from "./types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DRAFT_CONTENT = `---
generatedAt: "2026-01-15T10:00:00.000Z"
channel: "twitter"
status: "draft"
topic: "dark mode"
heuristicHashes:
  hook: "abc1234"
---

Check out our new dark mode feature!
`;

const DRAFT_2 = `---
generatedAt: "2026-01-15T11:00:00.000Z"
channel: "twitter"
status: "draft"
---

Second tweet about our roadmap.
`;

const POSTED_CONTENT = `---
generatedAt: "2026-01-14T10:00:00.000Z"
channel: "twitter"
status: "posted"
postedAt: "2026-01-14T12:00:00.000Z"
postUrl: "https://twitter.com/status/123"
postId: "123"
---

Previously posted content.
`;

function createMockPoster(
  success = true,
  postId = "post-123",
): ChannelPostFunction {
  return vi.fn(async (content: string) => ({
    success,
    postId: success ? postId : undefined,
    postUrl: success ? `https://twitter.com/status/${postId}` : undefined,
    error: success ? undefined : "API error",
    postedAt: new Date().toISOString(),
    platformData: success ? { likes: 0 } : undefined,
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createChannelRegistry", () => {
  it("should register and retrieve channel posters", () => {
    const registry = createChannelRegistry();
    const poster = createMockPoster();

    registry.register("twitter", poster);

    expect(registry.get("twitter")).toBe(poster);
    expect(registry.get("bluesky")).toBeUndefined();
    expect(registry.list()).toEqual(["twitter"]);
  });

  it("should list all registered channels", () => {
    const registry = createChannelRegistry();
    registry.register("twitter", createMockPoster());
    registry.register("bluesky", createMockPoster());

    expect(registry.list()).toEqual(["twitter", "bluesky"]);
  });
});

describe("readDraft", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "draft-read-"));
    await writeFile(join(tempDir, "draft.md"), DRAFT_CONTENT);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should read and parse draft metadata", async () => {
    const result = await readDraft(join(tempDir, "draft.md"));

    expect(result).not.toBeNull();
    expect(result!.metadata.channel).toBe("twitter");
    expect(result!.metadata.status).toBe("draft");
    expect(result!.metadata.topic).toBe("dark mode");
    expect(result!.content).toContain("dark mode feature");
  });

  it("should return null for non-existent file", async () => {
    const result = await readDraft("/nonexistent/file.md");
    expect(result).toBeNull();
  });
});

describe("listDrafts", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "drafts-list-"));
    await writeFile(join(tempDir, "draft1.md"), DRAFT_CONTENT);
    await writeFile(join(tempDir, "draft2.md"), DRAFT_2);
    await writeFile(join(tempDir, "readme.txt"), "Not a draft");
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should list all draft markdown files", async () => {
    const drafts = await listDrafts(tempDir);
    expect(drafts.length).toBe(2);
  });

  it("should sort drafts by generatedAt (oldest first)", async () => {
    const drafts = await listDrafts(tempDir);
    expect(drafts[0]!.metadata.generatedAt).toBe("2026-01-15T10:00:00.000Z");
    expect(drafts[1]!.metadata.generatedAt).toBe("2026-01-15T11:00:00.000Z");
  });

  it("should return empty for non-existent directory", async () => {
    const drafts = await listDrafts("/nonexistent/dir");
    expect(drafts).toEqual([]);
  });
});

describe("listPosted", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "posted-list-"));
    await writeFile(join(tempDir, "posted1.md"), POSTED_CONTENT);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should list posted files", async () => {
    const posted = await listPosted(tempDir);
    expect(posted.length).toBe(1);
    expect(posted[0]!.metadata.status).toBe("posted");
    expect(posted[0]!.metadata.postUrl).toBe("https://twitter.com/status/123");
  });
});

describe("postContent", () => {
  let draftsDir: string;
  let postedDir: string;

  beforeEach(async () => {
    draftsDir = await mkdtemp(join(tmpdir(), "post-drafts-"));
    postedDir = await mkdtemp(join(tmpdir(), "post-posted-"));
    await writeFile(join(draftsDir, "draft.md"), DRAFT_CONTENT);
  });

  afterEach(async () => {
    await rm(draftsDir, { recursive: true, force: true });
    await rm(postedDir, { recursive: true, force: true });
  });

  it("should post content and move to posted directory", async () => {
    const poster = createMockPoster(true, "tweet-456");
    const result = await postContent(
      join(draftsDir, "draft.md"),
      poster,
      postedDir,
    );

    expect(result.success).toBe(true);
    expect(result.postId).toBe("tweet-456");
    expect(result.postUrl).toContain("tweet-456");

    // Check posted file exists
    const postedFiles = await readdir(postedDir);
    expect(postedFiles).toContain("draft.md");

    // Check posted file has updated metadata
    const postedContent = await readFile(join(postedDir, "draft.md"), "utf-8");
    expect(postedContent).toContain('status: "posted"');
    expect(postedContent).toContain("postedAt:");
    expect(postedContent).toContain('postId: "tweet-456"');
  });

  it("should return error for failed post", async () => {
    const poster = createMockPoster(false);
    const result = await postContent(
      join(draftsDir, "draft.md"),
      poster,
      postedDir,
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("API error");
  });

  it("should handle non-existent draft", async () => {
    const poster = createMockPoster();
    const result = await postContent(
      "/nonexistent/draft.md",
      poster,
      postedDir,
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot read draft");
  });
});

describe("postOldestDraft", () => {
  let draftsDir: string;
  let postedDir: string;

  beforeEach(async () => {
    draftsDir = await mkdtemp(join(tmpdir(), "oldest-drafts-"));
    postedDir = await mkdtemp(join(tmpdir(), "oldest-posted-"));
    await writeFile(join(draftsDir, "draft1.md"), DRAFT_CONTENT);
    await writeFile(join(draftsDir, "draft2.md"), DRAFT_2);
  });

  afterEach(async () => {
    await rm(draftsDir, { recursive: true, force: true });
    await rm(postedDir, { recursive: true, force: true });
  });

  it("should post the oldest draft", async () => {
    const poster = createMockPoster();
    const result = await postOldestDraft(draftsDir, poster, postedDir);

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
  });

  it("should return null when no drafts exist", async () => {
    const emptyDir = await mkdtemp(join(tmpdir(), "empty-"));
    const poster = createMockPoster();
    const result = await postOldestDraft(emptyDir, poster, postedDir);

    expect(result).toBeNull();
    await rm(emptyDir, { recursive: true, force: true });
  });
});

describe("autopilot", () => {
  let draftsDir: string;
  let postedDir: string;

  beforeEach(async () => {
    draftsDir = await mkdtemp(join(tmpdir(), "auto-drafts-"));
    postedDir = await mkdtemp(join(tmpdir(), "auto-posted-"));
    await writeFile(join(draftsDir, "draft1.md"), DRAFT_CONTENT);
    await writeFile(join(draftsDir, "draft2.md"), DRAFT_2);
  });

  afterEach(async () => {
    await rm(draftsDir, { recursive: true, force: true });
    await rm(postedDir, { recursive: true, force: true });
  });

  it("should post multiple drafts", async () => {
    const poster = createMockPoster();
    const results = await autopilot(draftsDir, poster, postedDir, { count: 2 });

    expect(results.length).toBe(2);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it("should stop when no more drafts available", async () => {
    const poster = createMockPoster();
    const results = await autopilot(draftsDir, poster, postedDir, { count: 5 });

    expect(results.length).toBe(2); // Only 2 drafts available
  });
});

describe("getChannelStats", () => {
  let draftsDir: string;
  let postedDir: string;

  beforeEach(async () => {
    draftsDir = await mkdtemp(join(tmpdir(), "stats-drafts-"));
    postedDir = await mkdtemp(join(tmpdir(), "stats-posted-"));
    await writeFile(join(draftsDir, "draft1.md"), DRAFT_CONTENT);
    await writeFile(join(postedDir, "posted1.md"), POSTED_CONTENT);
  });

  afterEach(async () => {
    await rm(draftsDir, { recursive: true, force: true });
    await rm(postedDir, { recursive: true, force: true });
  });

  it("should return correct stats", async () => {
    const stats = await getChannelStats("twitter", draftsDir, postedDir);

    expect(stats.channel).toBe("twitter");
    expect(stats.draftsCount).toBe(1);
    expect(stats.postedCount).toBe(1);
    expect(stats.lastPostedAt).toBe("2026-01-14T12:00:00.000Z");
  });

  it("should handle empty directories", async () => {
    const emptyDrafts = await mkdtemp(join(tmpdir(), "empty-d-"));
    const emptyPosted = await mkdtemp(join(tmpdir(), "empty-p-"));

    const stats = await getChannelStats("bluesky", emptyDrafts, emptyPosted);

    expect(stats.draftsCount).toBe(0);
    expect(stats.postedCount).toBe(0);
    expect(stats.lastPostedAt).toBeNull();

    await rm(emptyDrafts, { recursive: true, force: true });
    await rm(emptyPosted, { recursive: true, force: true });
  });
});
