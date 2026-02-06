import { describe, it, expect } from "vitest";
import {
  defineGoogleProvider,
  defineGitHubProvider,
  defineDiscordProvider,
  buildAuthorizeUrl,
} from "./oauth.js";

describe("OAuth Providers", () => {
  it("creates a Google provider config", () => {
    const p = defineGoogleProvider("google-id", "google-secret");
    expect(p.name).toBe("google");
    expect(p.clientId).toBe("google-id");
    expect(p.authorizeUrl).toContain("google.com");
    expect(p.scopes).toContain("email");
  });

  it("creates a GitHub provider config", () => {
    const p = defineGitHubProvider("gh-id", "gh-secret");
    expect(p.name).toBe("github");
    expect(p.tokenUrl).toContain("github.com");
  });

  it("creates a Discord provider config", () => {
    const p = defineDiscordProvider("dc-id", "dc-secret");
    expect(p.name).toBe("discord");
    expect(p.scopes).toContain("identify");
  });

  it("builds an authorization URL with correct params", () => {
    const p = defineGoogleProvider("my-id", "my-secret");
    const url = buildAuthorizeUrl(p, "http://localhost:3000/callback", "random-state");

    expect(url).toContain("accounts.google.com");
    expect(url).toContain("client_id=my-id");
    expect(url).toContain("redirect_uri=");
    expect(url).toContain("state=random-state");
    expect(url).toContain("response_type=code");
  });
});
