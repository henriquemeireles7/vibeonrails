/**
 * SSRF (Server-Side Request Forgery) Protection
 *
 * Validates URLs to prevent requests to internal/private network addresses.
 * Block list includes: loopback, private networks, link-local, and IPv6 localhost.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SsrfValidationResult {
  /** Whether the URL is safe to fetch */
  safe: boolean;
  /** Reason for rejection, if unsafe */
  reason?: string;
}

// ---------------------------------------------------------------------------
// Private IP Ranges
// ---------------------------------------------------------------------------

interface IpRange {
  /** Network address as array of octets */
  network: number[];
  /** Subnet prefix length */
  prefix: number;
}

const BLOCKED_IPV4_RANGES: IpRange[] = [
  { network: [127, 0, 0, 0], prefix: 8 }, // Loopback
  { network: [10, 0, 0, 0], prefix: 8 }, // Private Class A
  { network: [172, 16, 0, 0], prefix: 12 }, // Private Class B
  { network: [192, 168, 0, 0], prefix: 16 }, // Private Class C
  { network: [169, 254, 0, 0], prefix: 16 }, // Link-local
  { network: [0, 0, 0, 0], prefix: 32 }, // Unspecified
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "[::1]",
  "[::0]",
  "[::]",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse an IPv4 address string into an array of octets.
 * Returns null if the string is not a valid IPv4 address.
 */
function parseIPv4(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  const octets: number[] = [];
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255 || String(num) !== part) {
      return null;
    }
    octets.push(num);
  }

  return octets;
}

/**
 * Check if an IPv4 address falls within a CIDR range.
 */
function isInRange(octets: number[], range: IpRange): boolean {
  const fullBits = Math.floor(range.prefix / 8);
  const remainingBits = range.prefix % 8;

  for (let i = 0; i < fullBits; i++) {
    if (octets[i] !== range.network[i]) return false;
  }

  if (remainingBits > 0 && fullBits < 4) {
    const mask = 0xff << (8 - remainingBits);
    if ((octets[fullBits] & mask) !== (range.network[fullBits] & mask)) {
      return false;
    }
  }

  return true;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if a URL points to an internal/private network address.
 *
 * @param url - The URL to check
 * @returns true if the URL resolves to a private/internal address
 */
export function isInternalUrl(url: string): boolean {
  let hostname: string;
  try {
    const parsed = new URL(url);
    hostname = parsed.hostname;
  } catch {
    return true; // Invalid URLs are treated as internal (blocked)
  }

  // Check blocked hostnames (localhost, 0.0.0.0, ::1, etc.)
  if (BLOCKED_HOSTNAMES.has(hostname.toLowerCase())) return true;

  // Check IPv6 loopback
  if (hostname === "::1" || hostname === "::0" || hostname === "::") {
    return true;
  }

  // Check IPv4 ranges
  const octets = parseIPv4(hostname);
  if (octets) {
    for (const range of BLOCKED_IPV4_RANGES) {
      if (isInRange(octets, range)) return true;
    }
  }

  return false;
}

/**
 * Validate that a URL is safe to make a server-side request to.
 *
 * Rejects URLs targeting private/internal networks to prevent SSRF attacks.
 *
 * @param url - The URL to validate
 * @returns Validation result with safety status and optional reason
 */
export function validateExternalUrl(url: string): SsrfValidationResult {
  if (!url || typeof url !== "string") {
    return { safe: false, reason: "URL is empty or not a string" };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { safe: false, reason: "URL is malformed" };
  }

  // Only allow HTTP(S) protocols
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      safe: false,
      reason: `Protocol '${parsed.protocol}' is not allowed`,
    };
  }

  if (isInternalUrl(url)) {
    return {
      safe: false,
      reason: `Hostname '${parsed.hostname}' resolves to a private/internal address`,
    };
  }

  return { safe: true };
}
