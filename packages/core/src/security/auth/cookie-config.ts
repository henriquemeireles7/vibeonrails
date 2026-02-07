/**
 * Secure Cookie Configuration
 *
 * Provides secure defaults for session cookies.
 * httpOnly prevents XSS access, sameSite prevents CSRF,
 * and secure ensures cookies are only sent over HTTPS in production.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SecureCookieOptions {
  /** Prevent JavaScript access to the cookie */
  httpOnly: boolean;
  /** Only send cookie over HTTPS */
  secure: boolean;
  /** CSRF protection strategy */
  sameSite: "strict" | "lax" | "none";
  /** Cookie path scope */
  path: string;
  /** Cookie max age in seconds */
  maxAge: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Default session cookie name */
export const SESSION_COOKIE_NAME = "vor_session";

/** Default max age: 7 days in seconds */
const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create secure cookie options with sensible defaults.
 *
 * - httpOnly: true (prevents XSS access)
 * - secure: true in production only
 * - sameSite: 'lax' (CSRF protection while allowing top-level navigation)
 * - path: '/'
 * - maxAge: 7 days (configurable)
 *
 * @param options - Optional overrides for any cookie property
 * @returns Complete cookie options object
 */
export function createSecureCookieOptions(
  options?: Partial<SecureCookieOptions>,
): SecureCookieOptions {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: options?.httpOnly ?? true,
    secure: options?.secure ?? isProduction,
    sameSite: options?.sameSite ?? "lax",
    path: options?.path ?? "/",
    maxAge: options?.maxAge ?? DEFAULT_MAX_AGE,
  };
}
