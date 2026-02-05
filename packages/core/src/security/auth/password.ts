/**
 * Password Hashing
 *
 * Uses Argon2id for password hashing - the recommended algorithm
 * for password storage (winner of the Password Hashing Competition).
 */

import { hash, verify } from '@node-rs/argon2';

/**
 * Default Argon2id parameters.
 * These follow OWASP recommendations for password storage.
 */
const ARGON2_OPTIONS = {
  memoryCost: 65536,  // 64 MB
  timeCost: 3,        // 3 iterations
  parallelism: 4,     // 4 threads
} as const;

/**
 * Hash a plain-text password using Argon2id.
 *
 * @param password - Plain-text password to hash
 * @returns Argon2id hash string
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a plain-text password against an Argon2id hash.
 *
 * @param hashedPassword - The stored Argon2id hash
 * @param password - Plain-text password to check
 * @returns true if the password matches the hash
 */
export async function verifyPassword(
  hashedPassword: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(hashedPassword, password);
  } catch {
    return false;
  }
}
