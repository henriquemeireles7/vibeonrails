/**
 * Pricing Configuration
 *
 * Centralized, server-side source of truth for allowed Stripe price IDs
 * and plan definitions. Prevents attackers from submitting arbitrary
 * price IDs to create checkout sessions at modified prices.
 *
 * Usage:
 *   import { createPricingConfig } from './pricing-config.js';
 *
 *   const pricing = createPricingConfig({
 *     plans: [
 *       { id: 'starter', name: 'Starter', priceIds: ['price_abc123'], maxTrialDays: 14 },
 *       { id: 'pro', name: 'Pro', priceIds: ['price_def456', 'price_ghi789'] },
 *     ],
 *   });
 *
 *   pricing.validatePriceId('price_abc123'); // does not throw
 *   pricing.validatePriceId('price_FAKE');   // throws PricingError
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlanDefinition {
  /** Unique plan identifier */
  id: string;
  /** Human-readable plan name */
  name: string;
  /** Allowed Stripe price IDs for this plan (monthly, yearly, etc.) */
  priceIds: string[];
  /** Maximum allowed trial days for this plan (0 = no trial) */
  maxTrialDays?: number;
}

export interface PricingConfigOptions {
  /** All available plans with their allowed price IDs */
  plans: PlanDefinition[];
}

export interface PricingConfig {
  /** Validate that a price ID exists in the allowed list. Throws if invalid. */
  validatePriceId(priceId: string): void;
  /** Validate trial days against the plan's maximum. Throws if exceeded. */
  validateTrialDays(priceId: string, trialDays?: number): void;
  /** Get the plan definition for a given price ID. Returns undefined if not found. */
  getPlanByPriceId(priceId: string): PlanDefinition | undefined;
  /** Get all allowed price IDs across all plans. */
  getAllowedPriceIds(): string[];
  /** Get all plan definitions. */
  getPlans(): readonly PlanDefinition[];
}

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class PricingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PricingError";
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a pricing configuration validator.
 *
 * All price IDs must be pre-registered. Any checkout or subscription
 * creation attempt with an unregistered price ID is rejected server-side.
 */
export function createPricingConfig(options: PricingConfigOptions): PricingConfig {
  const { plans } = options;

  // Build lookup: priceId -> PlanDefinition
  const priceIdToPlan = new Map<string, PlanDefinition>();
  for (const plan of plans) {
    for (const priceId of plan.priceIds) {
      if (priceIdToPlan.has(priceId)) {
        throw new PricingError(
          `Duplicate price ID "${priceId}" found in plans "${priceIdToPlan.get(priceId)!.id}" and "${plan.id}"`,
        );
      }
      priceIdToPlan.set(priceId, plan);
    }
  }

  return {
    validatePriceId(priceId: string): void {
      if (!priceIdToPlan.has(priceId)) {
        throw new PricingError(
          `Invalid price ID "${priceId}". Price must be one of the configured plan prices.`,
        );
      }
    },

    validateTrialDays(priceId: string, trialDays?: number): void {
      if (trialDays === undefined || trialDays === 0) return;

      const plan = priceIdToPlan.get(priceId);
      if (!plan) {
        throw new PricingError(
          `Invalid price ID "${priceId}". Cannot validate trial days.`,
        );
      }

      const maxTrial = plan.maxTrialDays ?? 0;
      if (trialDays > maxTrial) {
        throw new PricingError(
          `Trial period ${trialDays} days exceeds maximum of ${maxTrial} days for plan "${plan.id}".`,
        );
      }

      if (trialDays < 0 || !Number.isInteger(trialDays)) {
        throw new PricingError(
          `Trial period must be a non-negative integer. Got: ${trialDays}`,
        );
      }
    },

    getPlanByPriceId(priceId: string): PlanDefinition | undefined {
      return priceIdToPlan.get(priceId);
    },

    getAllowedPriceIds(): string[] {
      return Array.from(priceIdToPlan.keys());
    },

    getPlans(): readonly PlanDefinition[] {
      return plans;
    },
  };
}
