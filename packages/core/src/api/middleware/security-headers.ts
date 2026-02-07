/**
 * Hardened Security Headers Middleware
 *
 * Sets Content-Security-Policy, Strict-Transport-Security, and other
 * security headers. Replaces the basic `secureHeaders()` from Hono with
 * production-ready defaults that can be customized per-deployment.
 */

import type { MiddlewareHandler } from 'hono';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Individual CSP directive overrides. */
export interface CspDirectives {
  'default-src'?: string;
  'script-src'?: string;
  'style-src'?: string;
  'img-src'?: string;
  'font-src'?: string;
  'connect-src'?: string;
  'frame-ancestors'?: string;
  'base-uri'?: string;
  'form-action'?: string;
  'object-src'?: string;
}

export interface HardenedHeadersOptions {
  /** Override individual CSP directives (merged with defaults). */
  csp?: CspDirectives;
  /** Max-age for HSTS in seconds (default: 31536000 = 1 year). */
  hstsMaxAge?: number;
  /** Include subdomains in HSTS (default: true). */
  hstsIncludeSubDomains?: boolean;
  /** Disable CSP entirely (not recommended). */
  disableCsp?: boolean;
  /** Disable HSTS entirely (e.g. during local dev). */
  disableHsts?: boolean;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_CSP: Required<CspDirectives> = {
  'default-src': "'self'",
  'script-src': "'self'",
  'style-src': "'self' 'unsafe-inline'",
  'img-src': "'self' data: https:",
  'font-src': "'self'",
  'connect-src': "'self'",
  'frame-ancestors': "'none'",
  'base-uri': "'self'",
  'form-action': "'self'",
  'object-src': "'none'",
};

const DEFAULT_HSTS_MAX_AGE = 31_536_000; // 1 year in seconds

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a CSP header value from merged directives. */
function buildCsp(overrides?: CspDirectives): string {
  const merged = { ...DEFAULT_CSP, ...overrides };
  return Object.entries(merged)
    .map(([key, value]) => `${key} ${value}`)
    .join('; ');
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

/**
 * Create hardened security headers middleware.
 *
 * Sets CSP, HSTS, X-Content-Type-Options, X-Frame-Options,
 * Referrer-Policy, and Permissions-Policy headers.
 *
 * @param options - Optional customization for CSP and HSTS
 * @returns Hono middleware handler
 */
export function hardenedHeaders(options: HardenedHeadersOptions = {}): MiddlewareHandler {
  const {
    csp,
    hstsMaxAge = DEFAULT_HSTS_MAX_AGE,
    hstsIncludeSubDomains = true,
    disableCsp = false,
    disableHsts = false,
  } = options;

  const cspValue = disableCsp ? null : buildCsp(csp);
  const hstsValue = disableHsts
    ? null
    : `max-age=${hstsMaxAge}${hstsIncludeSubDomains ? '; includeSubDomains' : ''}`;

  return async (c, next) => {
    // CSP
    if (cspValue) {
      c.header('Content-Security-Policy', cspValue);
    }

    // HSTS
    if (hstsValue) {
      c.header('Strict-Transport-Security', hstsValue);
    }

    // Standard hardening headers
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    c.header('X-DNS-Prefetch-Control', 'off');
    c.header('X-Download-Options', 'noopen');
    c.header('X-Permitted-Cross-Domain-Policies', 'none');

    await next();
  };
}
