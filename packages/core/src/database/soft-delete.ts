/**
 * Soft Delete Helpers
 *
 * Provides reusable soft-delete operations for Drizzle ORM tables
 * that include a `deletedAt` timestamp column.
 *
 * Usage:
 *   import { softDeleteFilter, softDelete, restore } from './soft-delete.js';
 *
 *   // Filter out soft-deleted rows
 *   db.select().from(posts).where(softDeleteFilter(posts));
 *
 *   // Soft delete a row
 *   await softDelete(db, posts, id);
 *
 *   // Restore a soft-deleted row
 *   await restore(db, posts, id);
 */

import { eq, isNull, type SQL } from "drizzle-orm";
import type { PgTable, PgColumn } from "drizzle-orm/pg-core";
import type { Database } from "./client.js";

/** Table shape required for soft delete operations. */
interface SoftDeletableTable extends PgTable {
  id: PgColumn;
  deletedAt: PgColumn;
}

/**
 * Returns a WHERE clause condition that excludes soft-deleted rows.
 *
 * @param table - A Drizzle table with a `deletedAt` column
 * @returns SQL condition: `deletedAt IS NULL`
 */
export function softDeleteFilter<T extends SoftDeletableTable>(table: T): SQL {
  return isNull(table.deletedAt);
}

/**
 * Soft delete a row by setting `deletedAt` to the current timestamp.
 *
 * @param db - Drizzle database instance
 * @param table - A Drizzle table with `id` and `deletedAt` columns
 * @param id - The UUID of the row to soft delete
 * @returns True if a row was updated, false if not found
 */
export async function softDelete<T extends SoftDeletableTable>(
  db: Database,
  table: T,
  id: string,
): Promise<boolean> {
  const result = await (db as unknown as Database)
    .update(table)
    .set({ deletedAt: new Date() } as Record<string, unknown>)
    .where(eq(table.id, id))
    .returning();
  return (result as unknown[]).length > 0;
}

/**
 * Restore a soft-deleted row by setting `deletedAt` to null.
 *
 * @param db - Drizzle database instance
 * @param table - A Drizzle table with `id` and `deletedAt` columns
 * @param id - The UUID of the row to restore
 * @returns True if a row was updated, false if not found
 */
export async function restore<T extends SoftDeletableTable>(
  db: Database,
  table: T,
  id: string,
): Promise<boolean> {
  const result = await (db as unknown as Database)
    .update(table)
    .set({ deletedAt: null } as Record<string, unknown>)
    .where(eq(table.id, id))
    .returning();
  return (result as unknown[]).length > 0;
}
