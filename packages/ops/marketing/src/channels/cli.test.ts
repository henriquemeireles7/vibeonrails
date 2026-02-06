/**
 * Channels — CLI Tests
 *
 * Tests all channel CLI commands.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
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
import type { ChannelPostFunction } from "./types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DRAFT_1 = `---
generatedAt: "2026-01-15T10:00:00.000Z"
channel: "twitter"
status: "draft"
topic: "dark mode"
---

Check out our new dark mode feature!
`;

const DRAFT_2 = `---
generatedAt: "2026-01-15T11:00:00.000Z"
channel: "twitter"
status: "draft"
---

Our roadmap for Q2.
`;

const POSTED_1 = `---
generatedAt: "2026-01-14T10:00:00.000Z"
channel: "twitter"
status: "posted"
postedAt: "2026-01-14T12:00:00.000Z"
postUrl: "https://twitter.com/status/123"
---

Previously posted content.
`;

function createMockPoster(): ChannelPostFunction {
  return vi.fn(async () => ({
    success: true,
    postId: "post-999",
    postUrl: "https://twitter.com/status/post-999",
    postedAt: new Date().toISOString(),
  }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("resolveChannelPaths", () => {
  it("should resolve paths for twitter", () => {
    const paths = resolveChannelPaths("/my/project", "twitter");
    expect(paths.draftsDir).toBe(
      "/my/project/content/marketing/channels/twitter/drafts",
    );
    expect(paths.postedDir).toBe(
      "/my/project/content/marketing/channels/twitter/posted",
    );
  });

  it("should resolve paths for bluesky", () => {
    const paths = resolveChannelPaths("/my/project", "bluesky");
    expect(paths.draftsDir).toContain("bluesky");
    expect(paths.postedDir).toContain("bluesky");
  });
});

describe("executeDraftsList", () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), "cli-drafts-"));
    const twitterDrafts = join(
      projectDir,
      "content",
      "marketing",
      "channels",
      "twitter",
      "drafts",
    );
    await mkdir(twitterDrafts, { recursive: true });
    await writeFile(join(twitterDrafts, "draft1.md"), DRAFT_1);
    await writeFile(join(twitterDrafts, "draft2.md"), DRAFT_2);
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it("should list drafts for a specific channel", async () => {
    const drafts = await executeDraftsList(projectDir, "twitter");
    expect(drafts.length).toBe(2);
    expect(drafts[0]!.channel).toBe("twitter");
  });

  it("should include preview text", async () => {
    const drafts = await executeDraftsList(projectDir, "twitter");
    expect(drafts[0]!.preview).toContain("dark mode");
  });
});

describe("executePostedList", () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), "cli-posted-"));
    const twitterPosted = join(
      projectDir,
      "content",
      "marketing",
      "channels",
      "twitter",
      "posted",
    );
    await mkdir(twitterPosted, { recursive: true });
    await writeFile(join(twitterPosted, "posted1.md"), POSTED_1);
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it("should list posted content", async () => {
    const posted = await executePostedList(projectDir, "twitter");
    expect(posted.length).toBe(1);
    expect(posted[0]!.postUrl).toBe("https://twitter.com/status/123");
  });
});

describe("executeStats", () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), "cli-stats-"));

    const twitterDrafts = join(
      projectDir,
      "content",
      "marketing",
      "channels",
      "twitter",
      "drafts",
    );
    const twitterPosted = join(
      projectDir,
      "content",
      "marketing",
      "channels",
      "twitter",
      "posted",
    );
    await mkdir(twitterDrafts, { recursive: true });
    await mkdir(twitterPosted, { recursive: true });

    await writeFile(join(twitterDrafts, "draft1.md"), DRAFT_1);
    await writeFile(join(twitterPosted, "posted1.md"), POSTED_1);
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it("should return stats for a channel", async () => {
    const stats = await executeStats(projectDir, "twitter");
    expect(stats.length).toBe(1);
    expect(stats[0]!.channel).toBe("twitter");
    expect(stats[0]!.draftsCount).toBe(1);
    expect(stats[0]!.postedCount).toBe(1);
  });
});

describe("executePost", () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), "cli-post-"));
    const twitterDrafts = join(
      projectDir,
      "content",
      "marketing",
      "channels",
      "twitter",
      "drafts",
    );
    const twitterPosted = join(
      projectDir,
      "content",
      "marketing",
      "channels",
      "twitter",
      "posted",
    );
    await mkdir(twitterDrafts, { recursive: true });
    await mkdir(twitterPosted, { recursive: true });
    await writeFile(join(twitterDrafts, "draft1.md"), DRAFT_1);
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it("should post oldest draft when no file specified", async () => {
    const poster = createMockPoster();
    const result = await executePost({
      channel: "twitter",
      projectRoot: projectDir,
      poster,
    });

    expect(result).not.toBeNull();
    expect(result!.success).toBe(true);
  });
});

describe("executeAutopilot", () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), "cli-auto-"));
    const twitterDrafts = join(
      projectDir,
      "content",
      "marketing",
      "channels",
      "twitter",
      "drafts",
    );
    const twitterPosted = join(
      projectDir,
      "content",
      "marketing",
      "channels",
      "twitter",
      "posted",
    );
    await mkdir(twitterDrafts, { recursive: true });
    await mkdir(twitterPosted, { recursive: true });
    await writeFile(join(twitterDrafts, "draft1.md"), DRAFT_1);
    await writeFile(join(twitterDrafts, "draft2.md"), DRAFT_2);
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it("should post multiple drafts in autopilot mode", async () => {
    const poster = createMockPoster();
    const results = await executeAutopilot({
      channel: "twitter",
      count: 2,
      intervalMs: 0,
      projectRoot: projectDir,
      poster,
    });

    expect(results.length).toBe(2);
    expect(results.every((r) => r.success)).toBe(true);
  });
});

describe("format functions", () => {
  it("should format empty drafts list", () => {
    expect(formatDraftsList([])).toBe("No drafts found.");
  });

  it("should format drafts list with items", () => {
    const output = formatDraftsList([
      {
        filename: "draft1.md",
        channel: "twitter",
        generatedAt: "2026-01-15T10:00:00.000Z",
        topic: "dark mode",
        preview: "Check out dark mode",
      },
    ]);
    expect(output).toContain("[twitter]");
    expect(output).toContain("dark mode");
    expect(output).toContain("Total: 1");
  });

  it("should format empty posted list", () => {
    expect(formatPostedList([])).toBe("No posted content found.");
  });

  it("should format stats", () => {
    const output = formatStats([
      {
        channel: "twitter",
        draftsCount: 3,
        postedCount: 10,
        lastPostedAt: "2026-01-15T10:00:00.000Z",
        postsThisWeek: 2,
        postsThisMonth: 8,
      },
    ]);
    expect(output).toContain("TWITTER");
    expect(output).toContain("Drafts: 3");
    expect(output).toContain("Posted: 10");
    expect(output).toContain("This week: 2");
  });

  it("should format empty stats", () => {
    expect(formatStats([])).toBe("No channel stats available.");
  });
});
