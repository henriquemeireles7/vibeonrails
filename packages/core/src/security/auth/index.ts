/**
 * Authentication barrel export
 */

export { signAccessToken, signRefreshToken, verifyToken } from './jwt.js';
export { hashPassword, verifyPassword } from './password.js';
export { createSessionManager, createMemorySessionStore } from './sessions.js';
export type { SessionData, SessionStore, SessionManager } from './sessions.js';
export {
  defineGoogleProvider,
  defineGitHubProvider,
  defineDiscordProvider,
  buildAuthorizeUrl,
  exchangeCode,
} from './oauth.js';
export type { OAuthProviderConfig, OAuthUserInfo } from './oauth.js';
