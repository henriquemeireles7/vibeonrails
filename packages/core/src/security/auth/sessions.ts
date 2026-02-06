/**
 * Session Management — Create, validate, and revoke sessions backed by a store.
 */

export interface SessionData {
  userId: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

export interface SessionStore {
  get(sessionId: string): Promise<SessionData | null>;
  set(sessionId: string, data: SessionData, ttlMs: number): Promise<void>;
  del(sessionId: string): Promise<void>;
}

/** In-memory session store (for dev/testing). Use Redis in production. */
export function createMemorySessionStore(): SessionStore {
  const store = new Map<string, { data: SessionData; expiresAt: number }>();

  return {
    async get(sessionId) {
      const entry = store.get(sessionId);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(sessionId);
        return null;
      }
      return entry.data;
    },
    async set(sessionId, data, ttlMs) {
      store.set(sessionId, { data, expiresAt: Date.now() + ttlMs });
    },
    async del(sessionId) {
      store.delete(sessionId);
    },
  };
}

function generateSessionId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export function createSessionManager(store: SessionStore, ttlMs = DEFAULT_TTL) {
  return {
    async create(userId: string, role: string): Promise<string> {
      const sessionId = generateSessionId();
      const now = Date.now();
      await store.set(sessionId, { userId, role, createdAt: now, expiresAt: now + ttlMs }, ttlMs);
      return sessionId;
    },

    async validate(sessionId: string): Promise<SessionData | null> {
      return store.get(sessionId);
    },

    async revoke(sessionId: string): Promise<void> {
      await store.del(sessionId);
    },
  };
}

export type SessionManager = ReturnType<typeof createSessionManager>;
