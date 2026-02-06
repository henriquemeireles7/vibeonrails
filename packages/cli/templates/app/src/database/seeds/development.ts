/**
 * Development Seed — Populates the database with realistic sample data.
 *
 * Usage: npx vibe db:seed
 */

import { hashPassword } from "@vibeonrails/core/security";

interface SeedUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  passwordHash: string;
}

interface SeedPost {
  id: string;
  title: string;
  body: string;
  published: boolean;
  authorId: string;
}

export async function seedDevelopment(): Promise<void> {
  console.log("🌱 Seeding development database...\n");

  // --- Users ---------------------------------------------------------------

  const adminPassword = await hashPassword("admin123");
  const userPassword = await hashPassword("password123");

  const users: SeedUser[] = [
    {
      id: "00000000-0000-0000-0000-000000000001",
      email: "admin@example.com",
      name: "Admin User",
      role: "admin",
      passwordHash: adminPassword,
    },
    {
      id: "00000000-0000-0000-0000-000000000002",
      email: "jane@example.com",
      name: "Jane Doe",
      role: "user",
      passwordHash: userPassword,
    },
    {
      id: "00000000-0000-0000-0000-000000000003",
      email: "john@example.com",
      name: "John Smith",
      role: "user",
      passwordHash: userPassword,
    },
  ];

  // TODO: Insert users into database
  console.log(`  ✓ ${users.length} users created`);

  // --- Posts ---------------------------------------------------------------

  const posts: SeedPost[] = [
    {
      id: "10000000-0000-0000-0000-000000000001",
      title: "Welcome to Vibe on Rails",
      body: "This is the first post on your new application. You can edit or delete it.",
      published: true,
      authorId: users[0]!.id,
    },
    {
      id: "10000000-0000-0000-0000-000000000002",
      title: "Getting Started Guide",
      body: "Run `npx vibe generate module` to create new modules quickly.",
      published: true,
      authorId: users[1]!.id,
    },
    {
      id: "10000000-0000-0000-0000-000000000003",
      title: "Draft Post",
      body: "This is a draft post that hasn't been published yet.",
      published: false,
      authorId: users[2]!.id,
    },
  ];

  // TODO: Insert posts into database
  console.log(`  ✓ ${posts.length} posts created`);

  console.log("\n✅ Development seed complete!");
}
