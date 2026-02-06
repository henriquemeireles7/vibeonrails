/**
 * Mock Factories
 *
 * Factory functions for creating test data.
 */

/**
 * Mock user data.
 */
export interface MockUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly role: string;
  readonly isActive: boolean;
  readonly createdAt: string;
}

/**
 * Mock post data.
 */
export interface MockPost {
  readonly id: string;
  readonly title: string;
  readonly content: string;
  readonly published: boolean;
  readonly authorId: string;
  readonly createdAt: string;
}

/**
 * Mock contact data (for CRM).
 */
export interface MockContact {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly stage: string;
  readonly tags: readonly string[];
  readonly createdAt: string;
}

let userCounter = 0;
let postCounter = 0;
let contactCounter = 0;

/**
 * Create a mock user with defaults.
 */
export function mockUser(overrides: Partial<MockUser> = {}): MockUser {
  userCounter++;
  return {
    id: `user-${userCounter}`,
    email: `user${userCounter}@example.com`,
    name: `Test User ${userCounter}`,
    role: "user",
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock post with defaults.
 */
export function mockPost(overrides: Partial<MockPost> = {}): MockPost {
  postCounter++;
  return {
    id: `post-${postCounter}`,
    title: `Test Post ${postCounter}`,
    content: `Content for test post ${postCounter}`,
    published: false,
    authorId: "user-1",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock contact with defaults.
 */
export function mockContact(overrides: Partial<MockContact> = {}): MockContact {
  contactCounter++;
  return {
    id: `contact-${contactCounter}`,
    name: `Contact ${contactCounter}`,
    email: `contact${contactCounter}@example.com`,
    stage: "lead",
    tags: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Reset all counters (call in beforeEach).
 */
export function resetMockCounters(): void {
  userCounter = 0;
  postCounter = 0;
  contactCounter = 0;
}
