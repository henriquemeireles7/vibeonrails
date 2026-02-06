/**
 * Secure random token generation for email verification, password resets, etc.
 */

/**
 * Generate a URL-safe random token.
 * @param bytes - Number of random bytes (default 32)
 * @returns URL-safe base64 encoded string
 */
export function generateToken(bytes = 32): string {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return Buffer.from(buf).toString("base64url");
}

/**
 * Generate a numeric OTP code.
 * @param digits - Number of digits (default 6)
 */
export function generateOTP(digits = 6): string {
  const max = Math.pow(10, digits);
  const random = crypto.getRandomValues(new Uint32Array(1))[0]!;
  return String(random % max).padStart(digits, "0");
}
