import type { Database } from "../client.js";
import { users } from "../schema/user.js";
import { hashPassword } from "../../security/auth/password.js";

/**
 * Test seed data — minimal fixtures for automated tests.
 */
export async function seedTest(db: Database): Promise<void> {
  const hash = await hashPassword("testpassword");

  await db.insert(users).values([
    { email: "test@example.com", name: "Test User", passwordHash: hash, role: "user", emailVerified: true },
  ]);

  console.log("  Seeded 1 user (test)");
}
