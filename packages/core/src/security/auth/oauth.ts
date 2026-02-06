/**
 * OAuth Provider Configuration
 *
 * Type-safe OAuth provider definitions for Google, GitHub, Discord.
 * These are config helpers; actual OAuth flow uses standard HTTP redirects.
 */

export interface OAuthProviderConfig {
  name: string;
  clientId: string;
  clientSecret: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
}

export interface OAuthUserInfo {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  provider: string;
}

export function defineGoogleProvider(clientId: string, clientSecret: string): OAuthProviderConfig {
  return {
    name: "google",
    clientId,
    clientSecret,
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scopes: ["openid", "email", "profile"],
  };
}

export function defineGitHubProvider(clientId: string, clientSecret: string): OAuthProviderConfig {
  return {
    name: "github",
    clientId,
    clientSecret,
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    scopes: ["read:user", "user:email"],
  };
}

export function defineDiscordProvider(clientId: string, clientSecret: string): OAuthProviderConfig {
  return {
    name: "discord",
    clientId,
    clientSecret,
    authorizeUrl: "https://discord.com/api/oauth2/authorize",
    tokenUrl: "https://discord.com/api/oauth2/token",
    userInfoUrl: "https://discord.com/api/users/@me",
    scopes: ["identify", "email"],
  };
}

/**
 * Build the OAuth authorization URL for a given provider.
 */
export function buildAuthorizeUrl(
  provider: OAuthProviderConfig,
  redirectUri: string,
  state: string,
): string {
  const params = new URLSearchParams({
    client_id: provider.clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: provider.scopes.join(" "),
    state,
  });
  return `${provider.authorizeUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens. Returns raw JSON response.
 */
export async function exchangeCode(
  provider: OAuthProviderConfig,
  code: string,
  redirectUri: string,
): Promise<Record<string, unknown>> {
  const response = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      client_id: provider.clientId,
      client_secret: provider.clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new Error(`OAuth token exchange failed: ${response.status}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}
