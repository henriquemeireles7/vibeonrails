import { create } from "zustand";

// ---------------------------------------------------------------------------
// useAuth — Zustand auth store
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  login: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  setUser: (user: AuthUser) => void;
  getAccessToken: () => string | null;
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,

  login: (user, accessToken, refreshToken) => {
    set({ user, accessToken, refreshToken, isAuthenticated: true });

    // Persist tokens
    if (typeof window !== "undefined") {
      localStorage.setItem("vor_access_token", accessToken);
      localStorage.setItem("vor_refresh_token", refreshToken);
    }
  },

  logout: () => {
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });

    if (typeof window !== "undefined") {
      localStorage.removeItem("vor_access_token");
      localStorage.removeItem("vor_refresh_token");
    }
  },

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken });

    if (typeof window !== "undefined") {
      localStorage.setItem("vor_access_token", accessToken);
      localStorage.setItem("vor_refresh_token", refreshToken);
    }
  },

  setUser: (user) => {
    set({ user, isAuthenticated: true });
  },

  getAccessToken: () => {
    return get().accessToken;
  },
}));

/**
 * Initialize auth from localStorage (call on app mount).
 */
export function initAuthFromStorage(): void {
  if (typeof window === "undefined") return;

  const accessToken = localStorage.getItem("vor_access_token");
  const refreshToken = localStorage.getItem("vor_refresh_token");

  if (accessToken && refreshToken) {
    useAuth.setState({ accessToken, refreshToken });
  }
}
