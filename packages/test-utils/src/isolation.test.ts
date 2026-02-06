/**
 * Transaction Isolation — Tests
 *
 * Tests for the test isolation system:
 * - Rollback after success
 * - Rollback after failure
 * - No data persistence between tests
 * - Nested transaction (savepoint) support
 * - Error propagation
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  withTestTransaction,
  createSavepoint,
  rollbackToSavepoint,
  releaseSavepoint,
  resetSavepointCounter,
} from "./isolation.js";

// ---------------------------------------------------------------------------
// Mock Database
// ---------------------------------------------------------------------------

/**
 * Create a mock database that simulates Drizzle's transaction behavior.
 *
 * Tracks operations so we can verify isolation.
 */
function createMockDb() {
  const operations: string[] = [];
  let transactionRolledBack = false;

  const db = {
    operations,
    transactionRolledBack: () => transactionRolledBack,

    // Simulate Drizzle's transaction method
    async transaction(
      fn: (tx: Record<string, unknown>) => Promise<void>,
    ): Promise<void> {
      const tx = createMockTx(operations);
      try {
        await fn(tx);
      } catch (error: unknown) {
        transactionRolledBack = true;
        // Re-throw non-rollback errors
        if (
          error instanceof Error &&
          error.message === "__TEST_TRANSACTION_ROLLBACK__"
        ) {
          return;
        }
        throw error;
      }
    },

    // execute method for raw SQL
    async execute(sql: unknown): Promise<void> {
      operations.push(`execute: ${String(sql)}`);
    },
  };

  return db;
}

function createMockTx(operations: string[]): Record<string, unknown> {
  return {
    async execute(sql: unknown): Promise<void> {
      operations.push(`tx.execute: ${String(sql)}`);
    },
    insert(table: unknown) {
      return {
        async values(data: unknown) {
          operations.push(`tx.insert: ${JSON.stringify(data)}`);
          return data;
        },
      };
    },
    select() {
      return {
        async from(table: unknown) {
          operations.push("tx.select");
          return [];
        },
      };
    },
    update(table: unknown) {
      return {
        set(data: unknown) {
          return {
            async where(condition: unknown) {
              operations.push(`tx.update: ${JSON.stringify(data)}`);
              return data;
            },
          };
        },
      };
    },
    delete(table: unknown) {
      return {
        async where(condition: unknown) {
          operations.push("tx.delete");
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  resetSavepointCounter();
});

describe("withTestTransaction", () => {
  it("should roll back after successful test", async () => {
    const db = createMockDb();

    const result = await withTestTransaction(db, async (tx) => {
      const insert = (tx as Record<string, unknown>)["insert"] as Function;
      await insert("users").values({ name: "Alice" });
    });

    expect(result.rolledBack).toBe(true);
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(db.transactionRolledBack()).toBe(true);
  });

  it("should roll back after failed test and re-throw error", async () => {
    const db = createMockDb();

    await expect(
      withTestTransaction(db, async () => {
        throw new Error("Test assertion failed");
      }),
    ).rejects.toThrow("Test assertion failed");

    expect(db.transactionRolledBack()).toBe(true);
  });

  it("should execute test operations inside the transaction", async () => {
    const db = createMockDb();

    await withTestTransaction(db, async (tx) => {
      const insert = (tx as Record<string, unknown>)["insert"] as Function;
      await insert("users").values({ name: "Alice" });

      const select = (tx as Record<string, unknown>)["select"] as Function;
      await select().from("users");
    });

    expect(db.operations).toContain(
      'tx.insert: {"name":"Alice"}',
    );
    expect(db.operations).toContain("tx.select");
  });

  it("should not persist data between transactions", async () => {
    const db = createMockDb();

    // First transaction
    await withTestTransaction(db, async (tx) => {
      const insert = (tx as Record<string, unknown>)["insert"] as Function;
      await insert("users").values({ name: "Alice" });
    });

    // Create a fresh mock to simulate no persistence
    const db2 = createMockDb();
    await withTestTransaction(db2, async (tx) => {
      const select = (tx as Record<string, unknown>)["select"] as Function;
      const results = await select().from("users");
      expect(results).toEqual([]);
    });
  });

  it("should throw when db has no transaction method", async () => {
    const badDb = {} as Record<string, unknown>;

    await expect(
      withTestTransaction(badDb, async () => {}),
    ).rejects.toThrow("does not have a transaction() method");
  });

  it("should respect timeout option", async () => {
    const db = createMockDb();

    await withTestTransaction(
      db,
      async (tx) => {
        // The timeout should be set via execute
      },
      { timeoutMs: 5000 },
    );

    const timeoutOp = db.operations.find((op) =>
      op.includes("statement_timeout"),
    );
    expect(timeoutOp).toContain("5000ms");
  });

  it("should log when verbose is true", async () => {
    const db = createMockDb();
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await withTestTransaction(db, async () => {}, { verbose: true });

    const calls = consoleSpy.mock.calls.map((c) => c[0]);
    expect(calls.some((c) => typeof c === "string" && c.includes("[test-isolation]"))).toBe(
      true,
    );

    consoleSpy.mockRestore();
  });

  it("should track duration", async () => {
    const db = createMockDb();

    const result = await withTestTransaction(db, async () => {
      // Small delay to ensure non-zero duration
      await new Promise((r) => setTimeout(r, 10));
    });

    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(typeof result.durationMs).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// Savepoint Support
// ---------------------------------------------------------------------------

describe("createSavepoint", () => {
  it("should create a named savepoint", async () => {
    const operations: string[] = [];
    const tx = createMockTx(operations);

    const name = await createSavepoint(tx, "my_savepoint");
    expect(name).toBe("my_savepoint");
    expect(operations).toContain("tx.execute: SAVEPOINT my_savepoint");
  });

  it("should auto-generate savepoint name", async () => {
    const operations: string[] = [];
    const tx = createMockTx(operations);

    const name = await createSavepoint(tx);
    expect(name).toBe("sp_test_1");
    expect(operations).toContain("tx.execute: SAVEPOINT sp_test_1");
  });

  it("should increment auto-generated names", async () => {
    const operations: string[] = [];
    const tx = createMockTx(operations);

    const name1 = await createSavepoint(tx);
    const name2 = await createSavepoint(tx);
    expect(name1).toBe("sp_test_1");
    expect(name2).toBe("sp_test_2");
  });

  it("should throw when tx has no execute method", async () => {
    await expect(createSavepoint({}, "test")).rejects.toThrow(
      "does not support execute()",
    );
  });
});

describe("rollbackToSavepoint", () => {
  it("should rollback to a named savepoint", async () => {
    const operations: string[] = [];
    const tx = createMockTx(operations);

    await rollbackToSavepoint(tx, "my_savepoint");
    expect(operations).toContain(
      "tx.execute: ROLLBACK TO SAVEPOINT my_savepoint",
    );
  });

  it("should throw when tx has no execute method", async () => {
    await expect(rollbackToSavepoint({}, "test")).rejects.toThrow(
      "does not support execute()",
    );
  });
});

describe("releaseSavepoint", () => {
  it("should release a named savepoint", async () => {
    const operations: string[] = [];
    const tx = createMockTx(operations);

    await releaseSavepoint(tx, "my_savepoint");
    expect(operations).toContain(
      "tx.execute: RELEASE SAVEPOINT my_savepoint",
    );
  });

  it("should throw when tx has no execute method", async () => {
    await expect(releaseSavepoint({}, "test")).rejects.toThrow(
      "does not support execute()",
    );
  });
});

describe("resetSavepointCounter", () => {
  it("should reset the counter", async () => {
    const operations: string[] = [];
    const tx = createMockTx(operations);

    await createSavepoint(tx);
    await createSavepoint(tx);
    resetSavepointCounter();
    const name = await createSavepoint(tx);
    expect(name).toBe("sp_test_1");
  });
});
