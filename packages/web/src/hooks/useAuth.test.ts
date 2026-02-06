import { describe, it, expect, beforeEach } from "vitest";
import { useAuth } from "./useAuth.js";

describe("useAuth", () => {
  beforeEach(() => {
    // Reset the store before each test
    useAuth.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  });

  const mockUser = {
    id: "user-1",
    email: "test@example.com",
    name: "Test User",
  };

  it("starts with no user and not authenticated", () => {
    const state = useAuth.getState();
    expect(state.user).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.accessToken).toBeNull();
  });

  it("login sets user, tokens, and isAuthenticated", () => {
    useAuth.getState().login(mockUser, "access-token", "refresh-token");

    const state = useAuth.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe("access-token");
    expect(state.refreshToken).toBe("refresh-token");
    expect(state.isAuthenticated).toBe(true);
  });

  it("logout clears everything", () => {
    useAuth.getState().login(mockUser, "access-token", "refresh-token");
    useAuth.getState().logout();

    const state = useAuth.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });

  it("setTokens updates tokens without changing user", () => {
    useAuth.getState().login(mockUser, "old-access", "old-refresh");
    useAuth.getState().setTokens("new-access", "new-refresh");

    const state = useAuth.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.accessToken).toBe("new-access");
    expect(state.refreshToken).toBe("new-refresh");
  });

  it("setUser updates user and sets isAuthenticated", () => {
    useAuth.getState().setUser(mockUser);

    const state = useAuth.getState();
    expect(state.user).toEqual(mockUser);
    expect(state.isAuthenticated).toBe(true);
  });

  it("getAccessToken returns current token", () => {
    useAuth.getState().login(mockUser, "my-token", "refresh");
    expect(useAuth.getState().getAccessToken()).toBe("my-token");
  });
});
