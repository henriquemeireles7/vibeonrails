/**
 * JWT Token Management
 *
 * Handles signing and verifying JWT access tokens using the jose library.
 * Tokens are short-lived (15 minutes by default) and contain user identity.
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import type { TokenPayload } from '../../shared/types/index.js';

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      '[AOR] JWT_SECRET environment variable is required.\n' +
      '  Fix: Add JWT_SECRET to your .env file (minimum 32 characters).\n' +
      '  Docs: https://vibeonrails.dev/errors/JWT_SECRET_MISSING',
    );
  }

  return new TextEncoder().encode(secret);
}

/**
 * Sign an access token for a user.
 *
 * @param user - User data to encode in the token
 * @param expiresIn - Token expiration time (default: 15m)
 * @returns Signed JWT string
 */
export async function signAccessToken(
  user: { id: string; email: string; role: string },
  expiresIn = '15m',
): Promise<string> {
  return new SignJWT({
    sub: user.id,
    email: user.email,
    role: user.role,
  } as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

/**
 * Sign a refresh token for a user.
 *
 * @param userId - User ID to encode
 * @param expiresIn - Token expiration time (default: 7d)
 * @returns Signed JWT string
 */
export async function signRefreshToken(
  userId: string,
  expiresIn = '7d',
): Promise<string> {
  return new SignJWT({ sub: userId } as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

/**
 * Verify and decode a JWT token.
 *
 * @param token - JWT string to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as TokenPayload;
}
