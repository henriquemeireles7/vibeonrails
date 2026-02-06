import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  loadStack,
  saveStack,
  pushEntry,
  popEntry,
  peekEntry,
  stackDepth,
  clearStack,
  recordGenerate,
  recordAdd,
  recordRemove,
  executeUndo,
  generateEntryId,
  getStackPath,
} from "./stack.js";
import type { UndoEntry } from "./stack.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTmpDir(): string {
  const dir = join(tmpdir(), `vibe-undo-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function makeEntry(overrides: Partial<UndoEntry> = {}): UndoEntry {
  return {
    id: generateEntryId(),
    timestamp: new Date().toISOString(),
    operation: "generate",
    description: "Generate module order",
    reverse: { type: "delete-files", files: ["src/modules/order/index.ts"] },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Undo Stack", () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = makeTmpDir();
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // Stack CRUD
  // -------------------------------------------------------------------------

  describe("loadStack", () => {
    it("returns empty stack when file does not exist", () => {
      const stack = loadStack(projectRoot);
      expect(stack).toEqual({ version: 1, entries: [] });
    });

    it("reads persisted stack from disk", () => {
      const entry = makeEntry();
      saveStack(projectRoot, { version: 1, entries: [entry] });
      const stack = loadStack(projectRoot);
      expect(stack.entries).toHaveLength(1);
      expect(stack.entries[0]!.id).toBe(entry.id);
    });

    it("returns empty stack on corrupted file", () => {
      const stackPath = getStackPath(projectRoot);
      mkdirSync(join(projectRoot, ".vibe"), { recursive: true });
      writeFileSync(stackPath, "NOT_JSON", "utf-8");
      const stack = loadStack(projectRoot);
      expect(stack).toEqual({ version: 1, entries: [] });
    });
  });

  describe("pushEntry / popEntry", () => {
    it("pushes and pops entries in LIFO order", () => {
      const e1 = makeEntry({ description: "first" });
      const e2 = makeEntry({ description: "second" });
      pushEntry(projectRoot, e1);
      pushEntry(projectRoot, e2);

      expect(stackDepth(projectRoot)).toBe(2);

      const popped = popEntry(projectRoot);
      expect(popped?.description).toBe("second");
      expect(stackDepth(projectRoot)).toBe(1);
    });

    it("returns undefined when popping empty stack", () => {
      expect(popEntry(projectRoot)).toBeUndefined();
    });
  });

  describe("peekEntry", () => {
    it("returns most recent entry without removing", () => {
      const entry = makeEntry({ description: "peek me" });
      pushEntry(projectRoot, entry);

      const peeked = peekEntry(projectRoot);
      expect(peeked?.description).toBe("peek me");
      expect(stackDepth(projectRoot)).toBe(1);
    });

    it("returns undefined on empty stack", () => {
      expect(peekEntry(projectRoot)).toBeUndefined();
    });
  });

  describe("stack depth limit", () => {
    it("evicts oldest entries when exceeding max depth (10)", () => {
      for (let i = 0; i < 15; i++) {
        pushEntry(projectRoot, makeEntry({ description: `op-${i}` }));
      }
      expect(stackDepth(projectRoot)).toBe(10);

      // The oldest 5 should be gone
      const stack = loadStack(projectRoot);
      expect(stack.entries[0]!.description).toBe("op-5");
      expect(stack.entries[9]!.description).toBe("op-14");
    });
  });

  describe("clearStack", () => {
    it("removes all entries", () => {
      pushEntry(projectRoot, makeEntry());
      pushEntry(projectRoot, makeEntry());
      clearStack(projectRoot);
      expect(stackDepth(projectRoot)).toBe(0);
    });
  });

  // -------------------------------------------------------------------------
  // Recording Helpers
  // -------------------------------------------------------------------------

  describe("recordGenerate", () => {
    it("records a generate operation with delete-files reverse", () => {
      recordGenerate(projectRoot, "Generate module order", [
        "src/modules/order/index.ts",
        "src/modules/order/service.ts",
      ]);
      const entry = peekEntry(projectRoot);
      expect(entry?.operation).toBe("generate");
      expect(entry?.reverse.type).toBe("delete-files");
      expect(entry?.reverse.files).toHaveLength(2);
    });
  });

  describe("recordAdd", () => {
    it("records an add operation with delete-files reverse", () => {
      recordAdd(projectRoot, "Add marketing module", ["src/marketing/index.ts"]);
      const entry = peekEntry(projectRoot);
      expect(entry?.operation).toBe("add");
      expect(entry?.reverse.type).toBe("delete-files");
    });
  });

  describe("recordRemove", () => {
    it("records a remove operation with restore-files reverse", () => {
      recordRemove(projectRoot, "Remove marketing module", [
        { path: "src/marketing/index.ts", content: "export {};" },
      ]);
      const entry = peekEntry(projectRoot);
      expect(entry?.operation).toBe("remove");
      expect(entry?.reverse.type).toBe("restore-files");
      expect(entry?.reverse.restoreData).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Execute Undo
  // -------------------------------------------------------------------------

  describe("executeUndo", () => {
    it("deletes files for delete-files reverse", () => {
      // Create some files
      const filePath = join(projectRoot, "src/modules/order/index.ts");
      mkdirSync(join(projectRoot, "src/modules/order"), { recursive: true });
      writeFileSync(filePath, "export {};", "utf-8");
      expect(existsSync(filePath)).toBe(true);

      const entry = makeEntry({
        reverse: {
          type: "delete-files",
          files: ["src/modules/order/index.ts"],
        },
      });

      const affected = executeUndo(projectRoot, entry);
      expect(existsSync(filePath)).toBe(false);
      expect(affected).toEqual(["src/modules/order/index.ts"]);
    });

    it("restores files for restore-files reverse", () => {
      const entry = makeEntry({
        reverse: {
          type: "restore-files",
          restoreData: [
            { path: "src/restored/file.ts", content: "// restored content" },
          ],
        },
      });

      const affected = executeUndo(projectRoot, entry);
      const restoredPath = join(projectRoot, "src/restored/file.ts");
      expect(existsSync(restoredPath)).toBe(true);
      expect(readFileSync(restoredPath, "utf-8")).toBe("// restored content");
      expect(affected).toEqual(["src/restored/file.ts"]);
    });

    it("skips non-existent files in delete-files without error", () => {
      const entry = makeEntry({
        reverse: {
          type: "delete-files",
          files: ["nonexistent/file.ts"],
        },
      });

      const affected = executeUndo(projectRoot, entry);
      expect(affected).toEqual([]);
    });

    it("handles run-command type gracefully (no-op)", () => {
      const entry = makeEntry({
        reverse: {
          type: "run-command",
          command: "echo hello",
        },
      });

      const affected = executeUndo(projectRoot, entry);
      expect(affected).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------
  // Undo of undo
  // -------------------------------------------------------------------------

  describe("undo of undo", () => {
    it("supports undoing by popping sequential entries", () => {
      const e1 = makeEntry({ description: "first" });
      const e2 = makeEntry({ description: "second" });
      pushEntry(projectRoot, e1);
      pushEntry(projectRoot, e2);

      // First undo
      const first = popEntry(projectRoot);
      expect(first?.description).toBe("second");

      // Second undo
      const second = popEntry(projectRoot);
      expect(second?.description).toBe("first");

      // Stack is empty
      expect(popEntry(projectRoot)).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // generateEntryId
  // -------------------------------------------------------------------------

  describe("generateEntryId", () => {
    it("produces unique IDs", () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateEntryId());
      }
      expect(ids.size).toBe(100);
    });

    it("starts with 'undo-' prefix", () => {
      expect(generateEntryId().startsWith("undo-")).toBe(true);
    });
  });
});
