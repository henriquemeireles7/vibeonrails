import { eq } from "drizzle-orm";
import type { Database } from "../client.js";
import { users, type User, type NewUser } from "../schema/user.js";

/**
 * User repository — CRUD queries for the users table.
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

    async list(): Promise<User[]> {
      return db.select().from(users);
    },
  };
}

export type UserRepository = ReturnType<typeof createUserRepository>;
