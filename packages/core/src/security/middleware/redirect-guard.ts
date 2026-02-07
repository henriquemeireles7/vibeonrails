/**
 * Redirect Guard
 *
 * Prevents open redirect vulnerabilities by validating redirect URLs.
 * Blocks absolute URLs to external domains, javascript: URIs, data: URIs,
 * and protocol-relative URLs (//evil.com).
 */

// ---------------------------------------------------------------------------
// Blocked Protocols
// ---------------------------------------------------------------------------

const BLOCKED_PROTOCOLS = ["javascript:", "data:", "vbscript:", "blob:"];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validate that a redirect URL is safe to use.
 *
 * Safe URLs are:
 * - Relative paths (e.g. "/dashboard", "profile")
 * - Absolute URLs whose hostname is in the allowedHosts list
 *
 * Blocked URLs:
 * - Protocol-relative URLs (//evil.com)
 * - javascript:, data:, vbscript:, blob: protocols
 * - Absolute URLs to domains not in allowedHosts
 *
 * @param url - The redirect URL to validate
 * @param allowedHosts - List of allowed hostnames (e.g. ['myapp.com', 'www.myapp.com'])
 * @returns true if the URL is safe to redirect to
 */
export function validateRedirectUrl(
  url: string,
  allowedHosts: string[],
): boolean {
  if (!url || typeof url !== "string") return false;

  const trimmed = url.trim();

  // Block empty strings
  if (trimmed.length === 0) return false;

  // Block protocol-relative URLs (//evil.com)
  if (trimmed.startsWith("//")) return false;

  // Block dangerous protocols
  const lowerUrl = trimmed.toLowerCase();
  for (const protocol of BLOCKED_PROTOCOLS) {
    if (lowerUrl.startsWith(protocol)) return false;
  }

  // Check if it's an absolute URL
  let parsed: URL | null = null;
  try {
    parsed = new URL(trimmed);
  } catch {
    // Not a valid absolute URL - check if it's a relative path
  }

  if (parsed) {
    // Absolute URL: must have an allowed hostname
    return allowedHosts.includes(parsed.hostname);
  }

  // Relative URL: safe by default (starts with / or is a path segment)
  // But double-check for sneaky patterns like "\/evil.com" or backslash tricks
  if (trimmed.startsWith("\\")) return false;

  return true;
}
