import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { users, type User, type NewUser } from "../schema/user.js";
import {
  type PaginationOptions,
  type OffsetPaginatedResult,
  clampPagination,
  paginatedResult,
} from "../pagination.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** User object with passwordHash removed, safe for API responses. */
export type PublicUser = Omit<User, 'passwordHash'>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip passwordHash from a User object.
 *
 * @param user - Full User record
 * @returns User without passwordHash
 */
function toPublicUser(user: User): PublicUser {
  const { passwordHash: _removed, ...publicUser } = user;
  return publicUser;
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

/**
 * User repository — CRUD queries for the users table.
 *
 * All list methods enforce server-side pagination with a max page size cap.
 * Use `listPublic()` when returning user data in API responses to ensure
 * passwordHash is never leaked.
 */
export function createUserRepository(db: Database) {
  return {
    async findById(id: string): Promise<User | undefined> {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    },

    async findByEmail(email: string): Promise<User | undefined> {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0];
    },

    async create(data: NewUser): Promise<User> {
      const result = await db.insert(users).values(data).returning();
      return result[0]!;
    },

    async update(id: string, data: Partial<Omit<NewUser, "id">>): Promise<User | undefined> {
      const result = await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id))
        .returning();
      return result[0];
    },

    /**
     * List users with full data (including passwordHash).
     * For internal use only (e.g. admin, auth flows).
     */
    async list(options?: PaginationOptions): Promise<OffsetPaginatedResult<User>> {
      const { limit, offset } = clampPagination(options);
      const rows = await db
        .select()
        .from(users)
        .limit(limit + 1)
        .offset(offset);
      return paginatedResult(rows, limit, offset);
    },

    /**
     * List users with passwordHash stripped from each record.
     * Safe for API responses.
     */
    async listPublic(options?: PaginationOptions): Promise<OffsetPaginatedResult<PublicUser>> {
      const result = await this.list(options);
      return {
        data: result.data.map(toPublicUser),
        pagination: result.pagination,
      };
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
