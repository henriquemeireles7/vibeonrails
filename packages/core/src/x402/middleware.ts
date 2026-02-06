// VOR: x402 Hono middleware for paid API routes
// Intercepts requests, validates payment header, settles payment
// Returns 402 Payment Required with instructions on failure
// Status: experimental (opt-in via vibe.config.ts)

import type { MiddlewareHandler } from "hono";
import {
  createPaidRoute,
  parsePaymentHeader,
  validatePayment,
  createPaymentRequired,
  trackRevenue,
  type RevenueRecord,
} from "./protocol.js";

/**
 * Options for the x402 payment middleware.
 */
export interface X402MiddlewareOptions {
  /** Price as a string (e.g., "$0.01", "$1.00") */
  price: string;
  /** Human-readable description of the endpoint */
  description?: string;
  /** Settlement network (default: "base") */
  network?: string;
  /** Callback invoked after successful payment settlement */
  onPaymentSettled?: (record: RevenueRecord) => void | Promise<void>;
}

/**
 * Create x402 payment middleware for Hono routes.
 *
 * Validates the X-Payment header on incoming requests.
 * Returns 402 Payment Required with payment instructions if invalid.
 * Passes the request through and tracks revenue if valid.
 *
 * @example
 * ```ts
 * import { x402PaymentMiddleware } from '@vibeonrails/core/x402';
 *
 * app.use('/api/paid/*', x402PaymentMiddleware({
 *   price: '$0.01',
 *   description: 'AI generation endpoint',
 * }));
 * ```
 */
export function x402PaymentMiddleware(
  options: X402MiddlewareOptions,
): MiddlewareHandler {
  const config = createPaidRoute({
    price: options.price,
    description: options.description,
    network: options.network,
  });

  return async (c, next) => {
    const paymentHeader = c.req.header("X-Payment");
    const payment = parsePaymentHeader(paymentHeader);

    // No payment header or invalid format -> 402
    if (!payment) {
      const body = createPaymentRequired(config, c.req.path);
      return c.json(body, 402);
    }

    // Validate payment against route config
    const validation = validatePayment(payment, config);
    if (!validation.valid) {
      const body = createPaymentRequired(config, c.req.path);
      return c.json(body, 402);
    }

    // Payment valid -- track revenue
    const record = trackRevenue({
      token: payment.token,
      amount: payment.amount,
      currency: payment.currency,
      network: payment.network,
      endpoint: c.req.path,
    });

    // Notify settlement callback
    if (options.onPaymentSettled) {
      await options.onPaymentSettled(record);
    }

    // Set payment status header
    c.header("X-Payment-Status", "settled");

    // Pass through to the actual handler
    await next();
  };
}
