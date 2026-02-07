import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { users, type User, type NewUser } from "../schema/user.js";
import {
  type PaginationOptions,
  type OffsetPaginatedResult,
  clampPagination,
  paginatedResult,
} from "../pagination.js";

/**
 * User repository — CRUD queries for the users table.
 *
 * All list methods enforce server-side pagination with a max page size cap.
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

    async list(options?: PaginationOptions): Promise<OffsetPaginatedResult<User>> {
      const { limit, offset } = clampPagination(options);
      const rows = await db
        .select()
        .from(users)
        .limit(limit + 1)
        .offset(offset);
      return paginatedResult(rows, limit, offset);
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
