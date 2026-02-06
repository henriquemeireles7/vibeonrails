import type { User, UpdateUserInput } from "./user.types.js";

// ---------------------------------------------------------------------------
// UserService — Business Logic
// ---------------------------------------------------------------------------

// TODO: Replace in-memory store with database queries
const users: Map<string, User> = new Map();

export const UserService = {
  async findById(id: string): Promise<User | null> {
    return users.get(id) ?? null;
  },

  async findByEmail(email: string): Promise<User | null> {
    for (const user of users.values()) {
      if (user.email === email) return user;
    }
    return null;
  },

  async findAll(): Promise<User[]> {
    return Array.from(users.values());
  },

  async update(id: string, data: UpdateUserInput): Promise<User | null> {
    const user = users.get(id);
    if (!user) return null;

    const updated = { ...user, ...data, updatedAt: new Date() };
    users.set(id, updated);
    return updated;
  },
};
