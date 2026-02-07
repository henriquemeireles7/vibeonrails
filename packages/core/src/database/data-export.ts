/**
 * Data Export (GDPR / Right to Data Portability)
 *
 * Exports all user data as a JSON-serializable object.
 * Strips sensitive fields (passwordHash) from the output.
 */

import { eq } from "drizzle-orm";
import type { Database } from "./client.js";
import { users } from "./schema/user.js";
import { posts } from "./schema/post.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportedUserData {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  posts: Array<{
    id: string;
    title: string;
    body: string;
    published: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  exportedAt: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Export all data for a given user.
 *
 * Queries the user record and all related posts, strips sensitive fields
 * (passwordHash), and returns a JSON-serializable object suitable for download.
 *
 * @param db - Drizzle database instance
 * @param userId - ID of the user to export data for
 * @returns Exported user data object, or null if user not found
 */
export async function exportUserData(
  db: Database,
  userId: string,
): Promise<ExportedUserData | null> {
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const userRow = userRows[0];
  if (!userRow) return null;

  const userPosts = await db
    .select()
    .from(posts)
    .where(eq(posts.authorId, userId));

  return {
    user: {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      role: userRow.role,
      emailVerified: userRow.emailVerified,
      createdAt: userRow.createdAt.toISOString(),
      updatedAt: userRow.updatedAt.toISOString(),
    },
    posts: userPosts.map((p) => ({
      id: p.id,
      title: p.title,
      body: p.body,
      published: p.published,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
    exportedAt: new Date().toISOString(),
  };
}
