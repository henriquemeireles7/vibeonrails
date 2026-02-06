import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getGitLog,
  getGitDiff,
  formatHistoryEntry,
  formatDiff,
} from "./content-history.js";
import type { ContentHistoryEntry } from "./content-history.js";

// ---------------------------------------------------------------------------
// We mock execSync to avoid needing a real git repo in tests
// ---------------------------------------------------------------------------

vi.mock("node:child_process", () => ({
  execSync: vi.fn(),
}));

import { execSync } from "node:child_process";

const mockedExecSync = vi.mocked(execSync);

describe("Content History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // Git log parsing
  // -------------------------------------------------------------------------

  describe("getGitLog", () => {
    it("parses git log output into entries", () => {
      mockedExecSync.mockReturnValue(
        "abc123||Alice||2025-01-15 10:00:00 +0000||Update hero copy\n" +
        "def456||Bob||2025-01-14 09:00:00 +0000||Initial content",
      );

      const entries = getGitLog("content/blog/post.md", "/project");

      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({
        commit: "abc123",
        author: "Alice",
        date: "2025-01-15 10:00:00 +0000",
        message: "Update hero copy",
      });
      expect(entries[1]).toEqual({
        commit: "def456",
        author: "Bob",
        date: "2025-01-14 09:00:00 +0000",
        message: "Initial content",
      });
    });

    it("returns empty array when no history", () => {
      mockedExecSync.mockReturnValue("");
      const entries = getGitLog("new-file.md", "/project");
      expect(entries).toEqual([]);
    });

    it("returns empty array on git error", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error("not a git repo");
      });
      const entries = getGitLog("file.md", "/project");
      expect(entries).toEqual([]);
    });

    it("respects limit parameter", () => {
      mockedExecSync.mockReturnValue("abc||Author||Date||Msg");
      getGitLog("file.md", "/project", 5);
      expect(mockedExecSync).toHaveBeenCalledWith(
        expect.stringContaining("-n 5"),
        expect.anything(),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Git diff
  // -------------------------------------------------------------------------

  describe("getGitDiff", () => {
    it("returns diff output for a commit", () => {
      mockedExecSync.mockReturnValue(
        "--- a/file.md\n+++ b/file.md\n@@ -1 +1 @@\n-old\n+new",
      );
      const diff = getGitDiff("file.md", "abc123", "/project");
      expect(diff).toContain("-old");
      expect(diff).toContain("+new");
    });

    it("returns empty string on error", () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error("bad commit");
      });
      const diff = getGitDiff("file.md", "bad", "/project");
      expect(diff).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // Formatting
  // -------------------------------------------------------------------------

  describe("formatHistoryEntry", () => {
    it("formats an entry with index, short hash, and message", () => {
      const entry: ContentHistoryEntry = {
        commit: "abcdef1234567890",
        author: "Alice",
        date: "2025-01-15",
        message: "Update hero",
      };
      const formatted = formatHistoryEntry(entry, 0);
      expect(formatted).toContain("abcdef12");
      expect(formatted).toContain("Update hero");
      expect(formatted).toContain("Alice");
    });
  });

  describe("formatDiff", () => {
    it("colors additions in green", () => {
      const diff = "+added line";
      const result = formatDiff(diff);
      // chalk adds ANSI codes; just check the line content is present
      expect(result).toContain("+added line");
    });

    it("colors removals in red", () => {
      const diff = "-removed line";
      const result = formatDiff(diff);
      expect(result).toContain("-removed line");
    });

    it("handles empty diff", () => {
      const result = formatDiff("");
      expect(result).toContain("no changes");
    });

    it("colors hunk headers in cyan", () => {
      const diff = "@@ -1,3 +1,4 @@";
      const result = formatDiff(diff);
      expect(result).toContain("@@ -1,3 +1,4 @@");
    });
  });
});
