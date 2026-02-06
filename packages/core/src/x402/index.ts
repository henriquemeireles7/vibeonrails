/**
 * @vibeonrails/core/x402 - HTTP Payment Protocol (Experimental)
 *
 * x402 enables pay-per-API-call with USDC stablecoin settlement.
 * Mark any tRPC or Hono route as paid with a price declaration.
 *
 * Status: experimental (opt-in via vibe.config.ts)
 */

// Protocol primitives
export {
  createPaidRoute,
  parsePaymentHeader,
  validatePayment,
  createPaymentRequired,
  trackRevenue,
} from "./protocol.js";

export type {
  PaymentHeader,
  PaidRouteConfig,
  PaidRouteOptions,
  PaymentValidation,
  RevenueRecord,
  PaymentRequiredBody,
} from "./protocol.js";

// Hono middleware
export { x402PaymentMiddleware } from "./middleware.js";
export type { X402MiddlewareOptions } from "./middleware.js";
