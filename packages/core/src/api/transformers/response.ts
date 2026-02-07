/**
 * Response Transformer Utilities
 *
 * Type-safe helpers for stripping sensitive fields from objects before
 * sending them in API responses. Prevents accidental exposure of internal
 * data such as password hashes, tokens, or secrets.
 *
 * Usage:
 *   import { omitFields, pickFields, toPublicUser } from '@vibeonrails/core/api/transformers';
 *
 *   const safe = omitFields(user, ['passwordHash']);
 *   const public = toPublicUser(user);
 */

import type { User } from '../../database/schema/user.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A User object with passwordHash removed. */
export type PublicUser = Omit<User, 'passwordHash'>;

// ---------------------------------------------------------------------------
// Generic Helpers
// ---------------------------------------------------------------------------

/**
 * Return a shallow copy of `obj` with the specified keys removed.
 *
 * @param obj - Source object
 * @param fields - Keys to omit
 * @returns New object without the specified keys
 */
export function omitFields<T extends Record<string, unknown>>(
  obj: T,
  fields: ReadonlyArray<keyof T>,
): Partial<T> {
  const result = { ...obj };
  for (const field of fields) {
    delete result[field];
  }
  return result;
}

/**
 * Return a shallow copy of `obj` containing only the specified keys.
 *
 * @param obj - Source object
 * @param fields - Keys to keep
 * @returns New object with only the specified keys
 */
export function pickFields<T extends Record<string, unknown>>(
  obj: T,
  fields: ReadonlyArray<keyof T>,
): Partial<T> {
  const result: Partial<T> = {};
  for (const field of fields) {
    if (field in obj) {
      result[field] = obj[field];
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// User-specific Transformers
// ---------------------------------------------------------------------------

/**
 * Strip `passwordHash` from a User object for safe API responses.
 *
 * @param user - Full User object
 * @returns User without passwordHash
 */
export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _removed, ...publicUser } = user;
  return publicUser;
}

/**
 * Apply a transform function to every item in an array.
 * Commonly used with `toPublicUser` for list endpoints.
 *
 * @param items - Array of items to transform
 * @param transform - Transform function to apply
 * @returns Transformed array
 */
export function toPublicList<T, R>(items: T[], transform: (item: T) => R): R[] {
  return items.map(transform);
}
