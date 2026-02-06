/**
 * File-Based OAuth Token Store
 *
 * Stores encrypted OAuth tokens in .vibe/credentials.json.
 * The file is gitignored by default. Tokens are encrypted with
 * AES-256-GCM using a key derived from JWT_SECRET.
 */

import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { encryptToken, decryptToken } from './encrypt.js';
import {
  type TokenStore,
  type OAuthToken,
  type TokenRefreshConfig,
  type CredentialsFile,
  type TokenStatus,
  CredentialsFileSchema,
  TokenRefreshConfigSchema,
} from './types.js';

const DEFAULT_CREDENTIALS_PATH = '.vibe/credentials.json';

export interface FileTokenStoreOptions {
  /** Path to the credentials file (relative to project root) */
  credentialsPath?: string;

  /** The JWT secret used to derive the encryption key */
  jwtSecret: string;

  /** Project root directory */
  projectRoot?: string;
}

/**
 * Create a file-based token store.
 *
 * Stores encrypted OAuth tokens in .vibe/credentials.json.
 * Tokens are encrypted using AES-256-GCM with a key derived from JWT_SECRET.
 */
export function createFileTokenStore(
  options: FileTokenStoreOptions,
): TokenStore & { getTokenStatus: (provider: string) => Promise<TokenStatus> } {
  const credentialsPath = options.credentialsPath ?? DEFAULT_CREDENTIALS_PATH;
  const projectRoot = options.projectRoot ?? process.cwd();
  const filePath = join(projectRoot, credentialsPath);
  const jwtSecret = options.jwtSecret;

  async function readCredentials(): Promise<CredentialsFile> {
    try {
      await access(filePath);
      const raw = await readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      const result = CredentialsFileSchema.safeParse(parsed);
      if (!result.success) {
        // File is corrupted or wrong version — start fresh
        return { version: 1, tokens: {}, refreshConfigs: {} };
      }
      return result.data;
    } catch {
      // File doesn't exist — return empty
      return { version: 1, tokens: {}, refreshConfigs: {} };
    }
  }

  async function writeCredentials(data: CredentialsFile): Promise<void> {
    await mkdir(dirname(filePath), { recursive: true });
    const json = JSON.stringify(data, null, 2);
    await writeFile(filePath, json, 'utf-8');
  }

  return {
    async get(provider: string): Promise<OAuthToken | null> {
      const creds = await readCredentials();
      const encrypted = creds.tokens[provider];
      if (!encrypted) {
        return null;
      }
      return decryptToken(encrypted, jwtSecret);
    },

    async set(provider: string, token: OAuthToken): Promise<void> {
      const creds = await readCredentials();
      creds.tokens[provider] = await encryptToken(token, jwtSecret);
      await writeCredentials(creds);
    },

    async remove(provider: string): Promise<boolean> {
      const creds = await readCredentials();
      if (!(provider in creds.tokens)) {
        return false;
      }
      delete creds.tokens[provider];
      delete creds.refreshConfigs[provider];
      await writeCredentials(creds);
      return true;
    },

    async list(): Promise<string[]> {
      const creds = await readCredentials();
      return Object.keys(creds.tokens);
    },

    async has(provider: string): Promise<boolean> {
      const creds = await readCredentials();
      return provider in creds.tokens;
    },

    async getRefreshConfig(
      provider: string,
    ): Promise<TokenRefreshConfig | null> {
      const creds = await readCredentials();
      const config = creds.refreshConfigs[provider];
      if (!config) {
        return null;
      }
      const result = TokenRefreshConfigSchema.safeParse(config);
      return result.success ? result.data : null;
    },

    async setRefreshConfig(
      provider: string,
      config: TokenRefreshConfig,
    ): Promise<void> {
      const creds = await readCredentials();
      creds.refreshConfigs[provider] = config;
      await writeCredentials(creds);
    },

    async getTokenStatus(provider: string): Promise<TokenStatus> {
      const token = await this.get(provider);
      if (!token) {
        return {
          provider,
          hasToken: false,
          expiresAt: null,
          isExpired: false,
          lastRefreshedAt: null,
          scopes: [],
        };
      }

      const now = new Date();
      const expiresAt = token.expiresAt ?? null;
      const isExpired = expiresAt ? new Date(expiresAt) < now : false;

      return {
        provider,
        hasToken: true,
        expiresAt,
        isExpired,
        lastRefreshedAt: token.lastRefreshedAt ?? null,
        scopes: token.scopes,
      };
    },
  };
}
