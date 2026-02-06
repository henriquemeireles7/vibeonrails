/**
 * Error Catalog
 *
 * Every framework error is a structured object in this catalog.
 * Error code format: VOR_XXX_NNN where XXX is the domain and NNN is the number.
 * No ad-hoc throw new Error() — all errors must be registered here.
 */

// ---------------------------------------------------------------------------
// Error Entry Type
// ---------------------------------------------------------------------------

export interface ErrorCatalogEntry {
  /** Unique error code (e.g., "VOR_AUTH_001") */
  code: string;

  /** Human-readable message template. Use {param} for interpolation. */
  message: string;

  /** Detailed explanation */
  detail: string;

  /** HTTP status code */
  statusCode: number;

  /** Fix: either a command to run or an instruction */
  fix: string;

  /** Whether this error can be auto-fixed by an AI agent */
  autoFixable: boolean;

  /** Documentation URL */
  docsUrl: string;
}

// ---------------------------------------------------------------------------
// Error Domains
// ---------------------------------------------------------------------------

export const ERROR_DOMAINS = {
  AUTH: 'AUTH',
  DB: 'DB',
  CONFIG: 'CONFIG',
  API: 'API',
  VALIDATION: 'VALIDATION',
  ENV: 'ENV',
  MODULE: 'MODULE',
  SECURITY: 'SECURITY',
  INTEGRATION: 'INTEGRATION',
  CONTENT: 'CONTENT',
} as const;

export type ErrorDomain = (typeof ERROR_DOMAINS)[keyof typeof ERROR_DOMAINS];

// ---------------------------------------------------------------------------
// Error Registry
// ---------------------------------------------------------------------------

const DOCS_BASE = 'https://vibeonrails.dev/errors';

function entry(
  code: string,
  message: string,
  detail: string,
  statusCode: number,
  fix: string,
  autoFixable: boolean,
): ErrorCatalogEntry {
  return {
    code,
    message,
    detail,
    statusCode,
    fix,
    autoFixable,
    docsUrl: `${DOCS_BASE}/${code}`,
  };
}

/**
 * The complete error catalog. Every framework error must be registered here.
 */
export const ERROR_CATALOG: Record<string, ErrorCatalogEntry> = {
  // -------------------------------------------------------------------------
  // Authentication Errors (VOR_AUTH_*)
  // -------------------------------------------------------------------------
  VOR_AUTH_001: entry(
    'VOR_AUTH_001',
    'Invalid credentials',
    'The provided email or password is incorrect.',
    401,
    'Check email and password, then try again.',
    false,
  ),
  VOR_AUTH_002: entry(
    'VOR_AUTH_002',
    'Token expired',
    'The JWT access token has expired. A new token must be obtained via the refresh endpoint.',
    401,
    'Call the refresh token endpoint to obtain a new access token.',
    true,
  ),
  VOR_AUTH_003: entry(
    'VOR_AUTH_003',
    'Token invalid',
    'The JWT token is malformed or has an invalid signature.',
    401,
    'Obtain a new token by logging in again.',
    false,
  ),
  VOR_AUTH_004: entry(
    'VOR_AUTH_004',
    'Refresh token invalid',
    'The refresh token is invalid or has been revoked.',
    401,
    'Log in again to obtain a new session.',
    false,
  ),
  VOR_AUTH_005: entry(
    'VOR_AUTH_005',
    'User already exists',
    'A user with this email address is already registered.',
    409,
    'Use a different email or log in with the existing account.',
    false,
  ),

  // -------------------------------------------------------------------------
  // Database Errors (VOR_DB_*)
  // -------------------------------------------------------------------------
  VOR_DB_001: entry(
    'VOR_DB_001',
    'Database connection failed',
    'Cannot connect to the PostgreSQL database. The DATABASE_URL may be invalid or the database may be down.',
    503,
    'Check DATABASE_URL in .env. Options: (1) neon.tech for free tier, (2) docker compose up -d, (3) paste a valid URL.',
    true,
  ),
  VOR_DB_002: entry(
    'VOR_DB_002',
    'Migration failed',
    'A database migration failed to apply.',
    500,
    'Run `vibe db migrate --dry-run` to see the SQL. Fix the migration and retry.',
    false,
  ),
  VOR_DB_003: entry(
    'VOR_DB_003',
    'Record not found',
    'The requested record does not exist in the database.',
    404,
    'Verify the ID is correct.',
    false,
  ),

  // -------------------------------------------------------------------------
  // Configuration Errors (VOR_CONFIG_*)
  // -------------------------------------------------------------------------
  VOR_CONFIG_001: entry(
    'VOR_CONFIG_001',
    'Invalid configuration',
    'The vibe.config.ts file has validation errors.',
    500,
    'Check vibe.config.ts for the invalid field: {field}. Expected: {expected}.',
    true,
  ),
  VOR_CONFIG_002: entry(
    'VOR_CONFIG_002',
    'Missing configuration file',
    'vibe.config.ts was not found. Using all defaults.',
    500,
    'Create vibe.config.ts in the project root. Run `vibe init` to generate one.',
    true,
  ),

  // -------------------------------------------------------------------------
  // Environment Errors (VOR_ENV_*)
  // -------------------------------------------------------------------------
  VOR_ENV_001: entry(
    'VOR_ENV_001',
    'Missing required environment variable: {name}',
    'The environment variable {name} is required but not set.',
    500,
    'Add {name} to your .env file. {hint}',
    true,
  ),
  VOR_ENV_002: entry(
    'VOR_ENV_002',
    'Invalid environment variable: {name}',
    'The environment variable {name} has an invalid value.',
    500,
    '{fix}',
    true,
  ),
  VOR_ENV_003: entry(
    'VOR_ENV_003',
    'JWT_SECRET too short',
    'JWT_SECRET must be at least 32 characters for security.',
    500,
    'Run: openssl rand -base64 48 | tr -d "\\n" and set JWT_SECRET to the output.',
    true,
  ),

  // -------------------------------------------------------------------------
  // API Errors (VOR_API_*)
  // -------------------------------------------------------------------------
  VOR_API_001: entry(
    'VOR_API_001',
    'API key required',
    'This endpoint requires an API key.',
    401,
    'Include your API key in the X-API-Key header or Authorization: Bearer header.',
    false,
  ),
  VOR_API_002: entry(
    'VOR_API_002',
    'API key invalid',
    'The provided API key is not valid.',
    401,
    'Check that the API key is correct and has not been revoked.',
    false,
  ),
  VOR_API_003: entry(
    'VOR_API_003',
    'Rate limited',
    'Too many requests. You have exceeded the rate limit.',
    429,
    'Wait {retryAfter} seconds before retrying.',
    false,
  ),

  // -------------------------------------------------------------------------
  // Validation Errors (VOR_VALIDATION_*)
  // -------------------------------------------------------------------------
  VOR_VALIDATION_001: entry(
    'VOR_VALIDATION_001',
    'Validation failed',
    'The request input failed validation.',
    422,
    'Check the request body against the expected schema.',
    false,
  ),

  // -------------------------------------------------------------------------
  // Security Errors (VOR_SECURITY_*)
  // -------------------------------------------------------------------------
  VOR_SECURITY_001: entry(
    'VOR_SECURITY_001',
    'CSRF token invalid',
    'The CSRF token is missing or invalid.',
    403,
    'Include a valid CSRF token in the request.',
    false,
  ),
  VOR_SECURITY_002: entry(
    'VOR_SECURITY_002',
    'Forbidden',
    'You do not have permission to perform this action.',
    403,
    'Check that your user account has the required role.',
    false,
  ),

  // -------------------------------------------------------------------------
  // Module Errors (VOR_MODULE_*)
  // -------------------------------------------------------------------------
  VOR_MODULE_001: entry(
    'VOR_MODULE_001',
    'Module not installed: {module}',
    'The module {module} is not installed in this project.',
    500,
    'Run `vibe add {module}` to install it.',
    true,
  ),

  // -------------------------------------------------------------------------
  // Integration Errors (VOR_INTEGRATION_*)
  // -------------------------------------------------------------------------
  VOR_INTEGRATION_001: entry(
    'VOR_INTEGRATION_001',
    'Integration error: {integration}',
    'The external service {integration} returned an error: {detail}',
    502,
    'Check the {integration} service status and credentials.',
    false,
  ),
  VOR_INTEGRATION_002: entry(
    'VOR_INTEGRATION_002',
    'OAuth token expired: {provider}',
    'The OAuth token for {provider} has expired.',
    401,
    'Run `vibe connect {provider}` to re-authenticate.',
    true,
  ),

  // -------------------------------------------------------------------------
  // Content Errors (VOR_CONTENT_*)
  // -------------------------------------------------------------------------
  VOR_CONTENT_001: entry(
    'VOR_CONTENT_001',
    'Invalid frontmatter in {file}',
    'The frontmatter in {file} is missing required field: {field}.',
    422,
    'Add the {field} field to the frontmatter of {file}.',
    true,
  ),
};

// ---------------------------------------------------------------------------
// Catalog Functions
// ---------------------------------------------------------------------------

/**
 * Look up an error by code.
 */
export function getError(code: string): ErrorCatalogEntry | null {
  return ERROR_CATALOG[code] ?? null;
}

/**
 * Interpolate template parameters in an error message.
 * Replaces {param} placeholders with values from the params object.
 */
export function interpolateMessage(
  template: string,
  params: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => params[key] ?? `{${key}}`);
}

/**
 * Get all error codes (for validation of no duplicates).
 */
export function getAllErrorCodes(): string[] {
  return Object.keys(ERROR_CATALOG);
}

/**
 * Get errors by domain.
 */
export function getErrorsByDomain(domain: ErrorDomain): ErrorCatalogEntry[] {
  const prefix = `VOR_${domain}_`;
  return Object.values(ERROR_CATALOG).filter((e) =>
    e.code.startsWith(prefix),
  );
}
