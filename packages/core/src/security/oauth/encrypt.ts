/**
 * OAuth Token Encryption
 *
 * Encrypts/decrypts OAuth tokens using AES-256-GCM.
 * Derives the encryption key from JWT_SECRET via HKDF.
 * Reuses the core crypto module for encryption primitives.
 */

import { encrypt, decrypt } from '../crypto/encrypt.js';
import type { OAuthToken } from './types.js';
import { OAuthTokenSchema } from './types.js';

/**
 * Salt used for HKDF key derivation.
 * This separates the OAuth encryption key from the JWT signing key.
 */
const OAUTH_KEY_SALT = 'vibeonrails-oauth-token-store-v1';

/**
 * Derive a 256-bit encryption key from JWT_SECRET using HKDF.
 * This ensures the OAuth encryption key is different from the JWT signing key,
 * even though both are derived from the same secret.
 */
export async function deriveEncryptionKey(
  jwtSecret: string,
): Promise<string> {
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters for OAuth token encryption',
    );
  }

  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(jwtSecret),
    'HKDF',
    false,
    ['deriveBits'],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: encoder.encode(OAUTH_KEY_SALT),
      info: encoder.encode('oauth-tokens'),
    },
    keyMaterial,
    256,
  );

  const bytes = new Uint8Array(derivedBits);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Encrypt an OAuth token to a string for storage.
 */
export async function encryptToken(
  token: OAuthToken,
  jwtSecret: string,
): Promise<string> {
  const key = await deriveEncryptionKey(jwtSecret);
  const plaintext = JSON.stringify(token);
  return encrypt(plaintext, key);
}

/**
 * Decrypt a stored token string back to an OAuthToken.
 * Returns null if decryption fails or the token is malformed.
 */
export async function decryptToken(
  encryptedData: string,
  jwtSecret: string,
): Promise<OAuthToken | null> {
  try {
    const key = await deriveEncryptionKey(jwtSecret);
    const plaintext = await decrypt(encryptedData, key);
    const parsed = JSON.parse(plaintext);
    const result = OAuthTokenSchema.safeParse(parsed);
    if (!result.success) {
      return null;
    }
    return result.data;
  } catch {
    return null;
  }
}
