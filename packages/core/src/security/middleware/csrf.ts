/**
 * CSRF Protection Middleware for Hono
 *
 * Uses double-submit cookie pattern with HMAC verification.
 */

import { hmacSha256 } from "../crypto/hash.js";
import { generateToken } from "../crypto/tokens.js";

export interface CsrfOptions {
  secret: string;
  cookieName?: string;
  headerName?: string;
  excludePaths?: string[];
}

/**
 * Generate a CSRF token and its HMAC signature.
 */
export async function generateCsrfToken(secret: string): Promise<{ token: string; signature: string }> {
  const token = generateToken(32);
  const signature = await hmacSha256(token, secret);
  return { token, signature };
}

/**
 * Verify a CSRF token against its signature.
 */
export async function verifyCsrfToken(token: string, signature: string, secret: string): Promise<boolean> {
  const expected = await hmacSha256(token, secret);
  return expected === signature;
}
