/**
 * Pagination Helpers
 *
 * Provides standard pagination types and utilities for all repositories.
 * Enforces server-side max page size to prevent unbounded queries.
 *
 * Usage:
 *   import { type PaginationOptions, type PaginatedResult, clampPagination, paginatedResult } from './pagination.js';
 *
 *   async list(options?: PaginationOptions): Promise<PaginatedResult<User>> {
 *     const { limit, offset } = clampPagination(options);
 *     const rows = await db.select().from(users).limit(limit + 1).offset(offset);
 *     return paginatedResult(rows, limit, offset);
 *   }
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default number of items per page */
const DEFAULT_LIMIT = 20;

/** Maximum items per page (server-enforced cap) */
const MAX_LIMIT = 100;

/** Default offset */
const DEFAULT_OFFSET = 0;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaginationOptions {
  /** Number of items to return (capped at MAX_LIMIT) */
  limit?: number;
  /** Number of items to skip */
  offset?: number;
}

export interface OffsetPaginatedResult<T> {
  /** The items for the current page */
  data: T[];
  /** Pagination metadata */
  pagination: {
    /** Number of items returned */
    count: number;
    /** Current offset */
    offset: number;
    /** Requested limit */
    limit: number;
    /** Whether there are more items after this page */
    hasMore: boolean;
  };
}

export interface CursorPaginationOptions {
  /** Cursor for the next page (typically the last item's ID or timestamp) */
  cursor?: string;
  /** Number of items to return (capped at MAX_LIMIT) */
  limit?: number;
}

export interface CursorPaginatedResult<T> {
  /** The items for the current page */
  data: T[];
  /** Cursor pagination metadata */
  pagination: {
    /** Number of items returned */
    count: number;
    /** Requested limit */
    limit: number;
    /** Cursor to fetch the next page (null if no more items) */
    nextCursor: string | null;
    /** Whether there are more items after this page */
    hasMore: boolean;
  };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Clamp pagination options to safe server-side limits.
 * - limit is capped at MAX_LIMIT and defaults to DEFAULT_LIMIT
 * - offset is floored at 0
 */
export function clampPagination(options?: PaginationOptions): Required<PaginationOptions> {
  const rawLimit = options?.limit ?? DEFAULT_LIMIT;
  const rawOffset = options?.offset ?? DEFAULT_OFFSET;

  return {
    limit: Math.min(Math.max(1, Math.floor(rawLimit)), MAX_LIMIT),
    offset: Math.max(0, Math.floor(rawOffset)),
  };
}

/**
 * Clamp cursor pagination options to safe server-side limits.
 */
export function clampCursorPagination(options?: CursorPaginationOptions): {
  cursor: string | undefined;
  limit: number;
} {
  const rawLimit = options?.limit ?? DEFAULT_LIMIT;

  return {
    cursor: options?.cursor,
    limit: Math.min(Math.max(1, Math.floor(rawLimit)), MAX_LIMIT),
  };
}

/**
 * Build a PaginatedResult from a query that fetched limit+1 rows.
 *
 * The "limit + 1" trick: query for one extra row to determine if
 * there are more items without a separate COUNT query.
 *
 * @param rows - Rows returned from DB (should be queried with limit+1)
 * @param limit - The clamped limit
 * @param offset - The clamped offset
 */
export function paginatedResult<T>(rows: T[], limit: number, offset: number): OffsetPaginatedResult<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;

  return {
    data,
    pagination: {
      count: data.length,
      offset,
      limit,
      hasMore,
    },
  };
}

/**
 * Build a CursorPaginatedResult from a query that fetched limit+1 rows.
 *
 * @param rows - Rows returned from DB (should be queried with limit+1)
 * @param limit - The clamped limit
 * @param getCursor - Function to extract cursor value from the last item
 */
export function cursorPaginatedResult<T>(
  rows: T[],
  limit: number,
  getCursor: (item: T) => string,
): CursorPaginatedResult<T> {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const lastItem = data[data.length - 1];

  return {
    data,
    pagination: {
      count: data.length,
      limit,
      nextCursor: hasMore && lastItem ? getCursor(lastItem) : null,
      hasMore,
    },
  };
}

// Re-export constants for configuration reference
export const PAGINATION_DEFAULTS = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
} as const;
