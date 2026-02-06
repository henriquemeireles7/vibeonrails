import type { Database } from "../client.js";
import { users } from "../schema/user.js";
import { posts } from "../schema/post.js";
import { hashPassword } from "../../security/auth/password.js";

/**
 * Development seed data — sample users and posts for local dev.
 */
export async function seedDevelopment(db: Database): Promise<void> {
  const adminHash = await hashPassword("admin123456");
  const userHash = await hashPassword("user123456");

  const [admin, user] = await db
    .insert(users)
    .values([
      { email: "admin@example.com", name: "Admin User", passwordHash: adminHash, role: "admin", emailVerified: true },
      { email: "user@example.com", name: "Regular User", passwordHash: userHash, role: "user", emailVerified: true },
    ])
    .returning();

  await db.insert(posts).values([
    { title: "Welcome to Vibe on Rails", body: "This is your first post. Edit or delete it to get started.", published: true, authorId: admin!.id },
    { title: "Getting Started Guide", body: "Learn how to build full-stack apps with Vibe on Rails.", published: true, authorId: admin!.id },
    { title: "My Draft Post", body: "This post is not published yet.", published: false, authorId: user!.id },
  ]);

  console.log("  Seeded 2 users and 3 posts (development)");
}
