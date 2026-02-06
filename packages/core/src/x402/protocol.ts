// VOR: x402 HTTP payment protocol implementation
// paidProcedure.price('$0.01') marks any tRPC route as paid
// Client sends payment in HTTP header (x402 protocol)
// USDC stablecoin settlement. Revenue tracked in finance module.
// Status: experimental (opt-in via vibe.config.ts)

/**
 * Parsed payment header from an x402 HTTP request.
 */
export interface PaymentHeader {
  scheme: "x402";
  token: string;
  amount: number;
  currency: string;
  network: string;
}

/**
 * Configuration for a paid route.
 */
export interface PaidRouteConfig {
  /** Price in cents (USDC smallest unit) */
  priceInCents: number;
  /** Currency (default: USDC) */
  currency: string;
  /** Network for settlement (default: base) */
  network: string;
  /** Human-readable description of the endpoint */
  description: string;
}

/**
 * Options for creating a paid route.
 */
export interface PaidRouteOptions {
  /** Price as a string (e.g., "$0.01", "$1.00") */
  price: string;
  /** Description of what the payment covers */
  description?: string;
  /** Settlement network (default: "base") */
  network?: string;
}

/**
 * Payment validation result.
 */
export interface PaymentValidation {
  valid: boolean;
  reason?:
    | "insufficient_amount"
    | "currency_mismatch"
    | "network_mismatch"
    | "invalid_token";
}

/**
 * Revenue record for tracking x402 payments.
 */
export interface RevenueRecord {
  token: string;
  amountInCents: number;
  currency: string;
  network: string;
  endpoint: string;
  timestamp: number;
  status: "settled" | "pending" | "failed";
}

/**
 * 402 Payment Required response body.
 */
export interface PaymentRequiredBody {
  status: 402;
  error: "Payment Required";
  payment: {
    price: string;
    currency: string;
    network: string;
    endpoint: string;
    description: string;
    headerFormat: string;
  };
}

/**
 * Revenue tracking input.
 */
interface TrackRevenueInput {
  token: string;
  amount: number;
  currency: string;
  network: string;
  endpoint: string;
}

// ---------------------------------------------------------------------------
// Parse price string to cents
// ---------------------------------------------------------------------------

function parsePriceToCents(price: string): number {
  const cleaned = price.replace("$", "").trim();
  const num = parseFloat(cleaned);
  return Math.round(num * 100);
}

function formatCentsToPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Payment Header Parsing
// ---------------------------------------------------------------------------

/**
 * Parse an x402 payment header from the HTTP request.
 * Format: "x402 token=<token>;amount=<cents>;currency=<currency>;network=<network>"
 */
export function parsePaymentHeader(
  header: string | undefined | null,
): PaymentHeader | null {
  if (!header || header.trim() === "") return null;
  if (!header.startsWith("x402 ")) return null;

  const payload = header.slice(5); // remove "x402 " prefix
  const parts = payload.split(";");

  const parsed: Record<string, string> = {};
  for (const part of parts) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) return null;
    const key = part.slice(0, eqIdx).trim();
    const value = part.slice(eqIdx + 1).trim();
    parsed[key] = value;
  }

  if (!parsed.token || !parsed.amount || !parsed.currency || !parsed.network) {
    return null;
  }

  const amount = parseInt(parsed.amount, 10);
  if (isNaN(amount)) return null;

  return {
    scheme: "x402",
    token: parsed.token,
    amount,
    currency: parsed.currency,
    network: parsed.network,
  };
}

// ---------------------------------------------------------------------------
// Paid Route Configuration
// ---------------------------------------------------------------------------

/**
 * Create a paid route configuration.
 * Used to mark tRPC or Hono routes as requiring x402 payment.
 */
export function createPaidRoute(options: PaidRouteOptions): PaidRouteConfig {
  return {
    priceInCents: parsePriceToCents(options.price),
    currency: "USDC",
    network: options.network ?? "base",
    description: options.description ?? "",
  };
}

// ---------------------------------------------------------------------------
// Payment Validation
// ---------------------------------------------------------------------------

/**
 * Validate a payment header against the route's price requirements.
 */
export function validatePayment(
  payment: PaymentHeader,
  config: PaidRouteConfig,
): PaymentValidation {
  if (payment.currency !== config.currency) {
    return { valid: false, reason: "currency_mismatch" };
  }

  if (payment.network !== config.network) {
    return { valid: false, reason: "network_mismatch" };
  }

  if (payment.amount < config.priceInCents) {
    return { valid: false, reason: "insufficient_amount" };
  }

  return { valid: true };
}

// ---------------------------------------------------------------------------
// 402 Payment Required Response
// ---------------------------------------------------------------------------

/**
 * Create a 402 Payment Required response body with payment instructions.
 * Returned when a paid route receives a request without valid payment.
 */
export function createPaymentRequired(
  config: PaidRouteConfig,
  endpoint: string,
): PaymentRequiredBody {
  return {
    status: 402,
    error: "Payment Required",
    payment: {
      price: formatCentsToPrice(config.priceInCents),
      currency: config.currency,
      network: config.network,
      endpoint,
      description: config.description,
      headerFormat: `x402 token=<payment_token>;amount=${config.priceInCents};currency=${config.currency};network=${config.network}`,
    },
  };
}

// ---------------------------------------------------------------------------
// Revenue Tracking
// ---------------------------------------------------------------------------

/**
 * Track revenue from a successful x402 payment.
 * Creates a revenue record for the finance module.
 */
export function trackRevenue(input: TrackRevenueInput): RevenueRecord {
  return {
    token: input.token,
    amountInCents: input.amount,
    currency: input.currency,
    network: input.network,
    endpoint: input.endpoint,
    timestamp: Date.now(),
    status: "settled",
  };
}
