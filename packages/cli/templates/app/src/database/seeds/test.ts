/**
 * Test Seed — Minimal fixtures for testing.
 *
 * Usage: Called by test setup before each suite.
 */

import { hashPassword } from "@vibeonrails/core/security";

interface TestFixtures {
  adminUser: { id: string; email: string; name: string; role: "admin"; passwordHash: string };
  regularUser: { id: string; email: string; name: string; role: "user"; passwordHash: string };
  samplePost: { id: string; title: string; body: string; published: boolean; authorId: string };
}

export async function seedTest(): Promise<TestFixtures> {
  const passwordHash = await hashPassword("test-password");

  const adminUser = {
    id: "test-admin-0001",
    email: "admin@test.com",
    name: "Test Admin",
    role: "admin" as const,
    passwordHash,
  };

  const regularUser = {
    id: "test-user-0001",
    email: "user@test.com",
    name: "Test User",
    role: "user" as const,
    passwordHash,
  };

  const samplePost = {
    id: "test-post-0001",
    title: "Test Post",
    body: "Test body content",
    published: true,
    authorId: adminUser.id,
  };

  // TODO: Insert into database

  return { adminUser, regularUser, samplePost };
}
