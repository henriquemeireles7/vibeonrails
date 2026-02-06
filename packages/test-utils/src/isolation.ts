/**
 * Transaction Isolation for Integration Tests
 *
 * Every integration test runs inside a database transaction that rolls back
 * after the test. No data leaks. No cleanup needed.
 *
 * Usage:
 *   import { withTestTransaction } from '@vibeonrails/test-utils';
 *
 *   it('should create a user', async () => {
 *     await withTestTransaction(async (tx) => {
 *       await tx.insert(users).values({ name: 'Alice' });
 *       const result = await tx.select().from(users);
 *       expect(result).toHaveLength(1);
 *     });
 *     // Transaction automatically rolls back — no data persists
 *   });
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A database transaction context passed to test functions.
 *
 * This is a generic interface that wraps any Drizzle-compatible
 * transaction. Tests receive this and perform all DB operations through it.
 */
export interface TransactionContext {
  /** Execute a raw SQL query */
  execute(sql: unknown): Promise<unknown>;
  /** Insert records */
  insert(table: unknown): { values: (data: unknown) => Promise<unknown> };
  /** Select records */
  select(fields?: unknown): { from: (table: unknown) => Promise<unknown[]> };
  /** Update records */
  update(table: unknown): {
    set: (data: unknown) => { where: (condition: unknown) => Promise<unknown> };
  };
  /** Delete records */
  delete(table: unknown): { where: (condition: unknown) => Promise<unknown> };
}

/**
 * Options for transaction isolation.
 */
export interface IsolationOptions {
  /** Database connection string (defaults to DATABASE_URL env var) */
  readonly connectionString?: string;
  /** Timeout in milliseconds for the transaction (default: 30000) */
  readonly timeoutMs?: number;
  /** Whether to log transaction start/end (default: false) */
  readonly verbose?: boolean;
}

/**
 * Result of a test transaction.
 */
export interface TransactionResult {
  /** Whether the transaction was rolled back (always true in tests) */
  readonly rolledBack: boolean;
  /** Duration of the transaction in milliseconds */
  readonly durationMs: number;
  /** Any error that occurred during the test */
  readonly error?: Error;
}

// ---------------------------------------------------------------------------
// Transaction Isolation
// ---------------------------------------------------------------------------

/**
 * Internal flag for savepoint management.
 */
let savepointCounter = 0;

/**
 * Run a test function inside a database transaction that automatically
 * rolls back when the function completes (success or failure).
 *
 * This ensures complete test isolation — no data persists between tests.
 *
 * @param db - Drizzle database instance (from createDatabase())
 * @param testFn - Test function that receives a transaction context
 * @param options - Optional configuration
 * @returns Transaction result with timing info
 *
 * @example
 * ```typescript
 * import { withTestTransaction } from '@vibeonrails/test-utils';
 * import { db } from './test-setup';
 *
 * it('creates a user', async () => {
 *   await withTestTransaction(db, async (tx) => {
 *     await tx.insert(users).values({ name: 'Alice' });
 *     const result = await tx.select().from(users);
 *     expect(result).toHaveLength(1);
 *   });
 * });
 * ```
 */
export async function withTestTransaction<TDb extends Record<string, unknown>>(
  db: TDb,
  testFn: (tx: TDb) => Promise<void>,
  options: IsolationOptions = {},
): Promise<TransactionResult> {
  const { timeoutMs = 30_000, verbose = false } = options;
  const start = Date.now();

  // If the db has a `transaction` method (Drizzle pattern), use it
  const transactionFn = (db as Record<string, unknown>)["transaction"];
  if (typeof transactionFn !== "function") {
    throw new Error(
      "Database instance does not have a transaction() method. " +
        "Pass a Drizzle database instance created with createDatabase().",
    );
  }

  if (verbose) {
    console.log("[test-isolation] Starting test transaction...");
  }

  let testError: Error | undefined;

  try {
    // Use Drizzle's transaction method which provides a tx context
    await (transactionFn as Function).call(
      db,
      async (tx: TDb) => {
        // Set a statement timeout for safety
        if (typeof (tx as Record<string, unknown>)["execute"] === "function") {
          try {
            await (tx as Record<string, unknown> & { execute: Function }).execute(
              `SET LOCAL statement_timeout = '${timeoutMs}ms'`,
            );
          } catch {
            // Some drivers don't support this, which is fine
          }
        }

        try {
          await testFn(tx);
        } catch (error: unknown) {
          testError = error instanceof Error ? error : new Error(String(error));
        }

        // Always rollback by throwing a special error
        throw new TransactionRollback();
      },
    );
  } catch (error: unknown) {
    // TransactionRollback is expected — it triggers the rollback
    if (!(error instanceof TransactionRollback)) {
      // Unexpected error
      testError =
        testError ?? (error instanceof Error ? error : new Error(String(error)));
    }
  }

  const durationMs = Date.now() - start;

  if (verbose) {
    console.log(
      `[test-isolation] Transaction rolled back (${durationMs}ms)`,
    );
  }

  // Re-throw the original test error so the test fails properly
  if (testError) {
    throw testError;
  }

  return { rolledBack: true, durationMs };
}

/**
 * Special error class used to force transaction rollback.
 * This is caught internally and should never be seen by test code.
 */
class TransactionRollback extends Error {
  constructor() {
    super("__TEST_TRANSACTION_ROLLBACK__");
    this.name = "TransactionRollback";
  }
}

// ---------------------------------------------------------------------------
// Savepoint Support (Nested Transactions)
// ---------------------------------------------------------------------------

/**
 * Create a named savepoint within a transaction.
 *
 * Useful for nested transaction testing.
 *
 * @param tx - Transaction context
 * @param name - Optional savepoint name (auto-generated if not provided)
 * @returns Savepoint name
 */
export async function createSavepoint(
  tx: Record<string, unknown>,
  name?: string,
): Promise<string> {
  savepointCounter++;
  const spName = name ?? `sp_test_${savepointCounter}`;

  const executeFn = tx["execute"];
  if (typeof executeFn !== "function") {
    throw new Error("Transaction context does not support execute()");
  }

  await (executeFn as Function).call(tx, `SAVEPOINT ${spName}`);
  return spName;
}

/**
 * Rollback to a named savepoint.
 */
export async function rollbackToSavepoint(
  tx: Record<string, unknown>,
  name: string,
): Promise<void> {
  const executeFn = tx["execute"];
  if (typeof executeFn !== "function") {
    throw new Error("Transaction context does not support execute()");
  }

  await (executeFn as Function).call(tx, `ROLLBACK TO SAVEPOINT ${name}`);
}

/**
 * Release a named savepoint (commit the sub-transaction).
 */
export async function releaseSavepoint(
  tx: Record<string, unknown>,
  name: string,
): Promise<void> {
  const executeFn = tx["execute"];
  if (typeof executeFn !== "function") {
    throw new Error("Transaction context does not support execute()");
  }

  await (executeFn as Function).call(tx, `RELEASE SAVEPOINT ${name}`);
}

// ---------------------------------------------------------------------------
// Reset
// ---------------------------------------------------------------------------

/**
 * Reset the savepoint counter. Call in test setup if needed.
 */
export function resetSavepointCounter(): void {
  savepointCounter = 0;
}
