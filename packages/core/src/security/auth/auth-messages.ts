/**
 * Auth Messages
 *
 * Generic, user-facing authentication messages.
 * These are intentionally vague to prevent account enumeration attacks.
 * For example, "Invalid email or password" is used for both wrong email
 * and wrong password scenarios, so attackers cannot distinguish between them.
 */

export const AUTH_MESSAGES = {
  /** Wrong email or password (intentionally the same message) */
  INVALID_CREDENTIALS: "Invalid email or password",
  /** Account not found (same as INVALID_CREDENTIALS to prevent enumeration) */
  ACCOUNT_NOT_FOUND: "Invalid email or password",
  /** Password reset response (does not confirm account existence) */
  EMAIL_SENT: "If an account exists, a reset email has been sent",
  /** Successful registration */
  REGISTRATION_SUCCESS: "Account created successfully",
  /** Successful logout */
  LOGOUT_SUCCESS: "Logged out successfully",
} as const;

export type AuthMessageKey = keyof typeof AUTH_MESSAGES;
