/**
 * Data Deletion / Anonymization (GDPR / Right to Erasure)
 *
 * Anonymizes user PII by replacing identifying data with placeholder values.
 * Uses soft-delete approach to preserve referential integrity while removing
 * all personally identifiable information.
 */

import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { Database } from "./client.js";
import { users } from "./schema/user.js";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Anonymize a user's personally identifiable information.
 *
 * Replaces:
 * - name -> 'Deleted User'
 * - email -> 'deleted-{uuid}@anonymized.local'
 * - passwordHash -> '' (empty string)
 *
 * This is a soft-delete approach: the user record remains for referential
 * integrity, but all PII is scrubbed.
 *
 * @param db - Drizzle database instance
 * @param userId - ID of the user to anonymize
 * @returns true if the user was found and anonymized, false otherwise
 */
export async function anonymizeUser(
  db: Database,
  userId: string,
): Promise<boolean> {
  const anonymizedEmail = `deleted-${randomUUID()}@anonymized.local`;

  const result = await db
    .update(users)
    .set({
      name: "Deleted User",
      email: anonymizedEmail,
      passwordHash: "",
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ id: users.id });

  return result.length > 0;
}
