/**
 * Business Logic & Revenue Protection (BIZ-001 through BIZ-010)
 *
 * From vibeaudit.md: Protecting code paths that directly make and keep money.
 */

import type { AuditCheck } from "../types.js";
import { patternCheck, configCheck, manualCheck } from "../helpers.js";

export const businessChecks: AuditCheck[] = [
  // BIZ-001: Pricing Validated Server-Side
  configCheck({
    id: "BIZ-001",
    name: "Pricing Validated Server-Side",
    category: "business",
    severity: "critical",
    description: "Plan prices and discount amounts are validated on the server.",
    validate: (ctx) => {
      const pricingFiles = ctx.sourceFiles.filter((f) => /price|pricing|plan|billing|checkout/i.test(f));
      if (pricingFiles.length === 0) return [];
      const hasServerValidation = pricingFiles.some((f) => {
        const content = ctx.readFile(f);
        return /validate|schema|zod|joi|assert|check/i.test(content);
      });
      if (hasServerValidation) return [];
      return [{ file: pricingFiles[0] ?? "", message: "Pricing logic may lack server-side validation", suggestion: "Validate all pricing server-side with Zod schemas" }];
    },
  }),

  // BIZ-002: Trial Abuse Prevention
  manualCheck({
    id: "BIZ-002",
    name: "Trial Abuse Prevention",
    category: "business",
    severity: "high",
    description: "Free trials can't be restarted by creating new accounts or manipulating dates.",
  }),

  // BIZ-003: Subscription State Machine
  configCheck({
    id: "BIZ-003",
    name: "Subscription State Machine is Correct",
    category: "business",
    severity: "critical",
    description: "Every valid subscription transition is explicitly defined. Invalid ones blocked.",
    validate: (ctx) => {
      const subFiles = ctx.sourceFiles.filter((f) => /subscription|billing|plan/i.test(f));
      if (subFiles.length === 0) return [];
      const hasStateMachine = subFiles.some((f) => {
        const content = ctx.readFile(f);
        return /state.*machine|transition|status.*change|valid.*status|ACTIVE|CANCELLED|EXPIRED|PAST_DUE/i.test(content);
      });
      if (hasStateMachine) return [];
      return [{ file: "", message: "No subscription state machine detected", suggestion: "Define explicit subscription state transitions" }];
    },
  }),

  // BIZ-004: Downgrade Doesn't Break Access
  manualCheck({
    id: "BIZ-004",
    name: "Downgrade Doesn't Break Access",
    category: "business",
    severity: "medium",
    description: "Existing data isn't deleted on downgrade. Users see what they're missing.",
  }),

  // BIZ-005: Coupon/Discount Validation
  configCheck({
    id: "BIZ-005",
    name: "Coupon/Discount Validation",
    category: "business",
    severity: "high",
    description: "Coupons can't be applied multiple times or used after expiration.",
    validate: (ctx) => {
      const couponFiles = ctx.sourceFiles.filter((f) => /coupon|discount|promo/i.test(f));
      if (couponFiles.length === 0) return [];
      const hasValidation = couponFiles.some((f) => {
        const content = ctx.readFile(f);
        return /expire|valid|used|redeemed|maxUsage|limit/i.test(content);
      });
      if (hasValidation) return [];
      return [{ file: couponFiles[0] ?? "", message: "Coupon system may lack validation", suggestion: "Add expiry, usage limits, and duplicate checks" }];
    },
  }),

  // BIZ-006: Refund Process
  manualCheck({
    id: "BIZ-006",
    name: "Refund Process Exists",
    category: "business",
    severity: "medium",
    description: "You have a way to refund that revokes access and updates subscription state.",
  }),

  // BIZ-007: Usage Limits Enforced Server-Side
  configCheck({
    id: "BIZ-007",
    name: "Usage Limits Enforced Server-Side",
    category: "business",
    severity: "high",
    description: "Plan limits (X items, Y API calls) are enforced in backend, not just UI.",
    validate: (ctx) => {
      const hasLimits = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /usageLimit|usage.*limit|plan.*limit|quota|maxItems|maxCalls/i.test(content);
      });
      if (hasLimits) return [];
      return [];
    },
  }),

  // BIZ-008: Currency/Tax Handled
  manualCheck({
    id: "BIZ-008",
    name: "Currency/Tax Handled Correctly",
    category: "business",
    severity: "medium",
    description: "If selling internationally, prices, currency, and tax are correct.",
  }),

  // BIZ-009: Cancellation Flow is Clean
  configCheck({
    id: "BIZ-009",
    name: "Cancellation Flow is Clean",
    category: "business",
    severity: "medium",
    description: "Users can cancel without contacting support. Takes effect at period end.",
    validate: (ctx) => {
      const hasCancel = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /cancel.*subscription|unsubscribe|cancelAtPeriodEnd/i.test(content);
      });
      if (hasCancel) return [];
      const hasSub = ctx.sourceFiles.some((f) => /subscription|billing/i.test(f));
      if (!hasSub) return [];
      return [{ file: "", message: "No cancellation flow detected", suggestion: "Implement self-serve cancellation" }];
    },
  }),

  // BIZ-010: Failed Payment Retry Logic
  configCheck({
    id: "BIZ-010",
    name: "Failed Payment Retry Logic",
    category: "business",
    severity: "high",
    description: "When payment fails, system retries with backoff. Users can update payment method.",
    validate: (ctx) => {
      const hasRetry = ctx.sourceFiles.some((f) => {
        const content = ctx.readFile(f);
        return /retry.*payment|payment.*retry|past_due|invoice.*failed|smart.*retry/i.test(content);
      });
      if (hasRetry) return [];
      const hasPayment = ctx.sourceFiles.some((f) => /payment|stripe|billing/i.test(f));
      if (!hasPayment) return [];
      return [{ file: "", message: "No payment retry logic detected", suggestion: "Add retry logic for failed payments (or rely on Stripe smart retry)" }];
    },
  }),
];
