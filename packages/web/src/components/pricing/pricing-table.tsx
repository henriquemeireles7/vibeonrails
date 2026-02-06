// VOR: PricingTable component - reads plans and renders pricing cards
// Renders plan name, price, features, CTA button
// Stripe checkout pre-connected to each button via onSelectPlan callback

import React from "react";

/**
 * A pricing plan definition.
 * Can be parsed from content/pricing/plans.md or defined inline.
 */
export interface PricingPlan {
  /** Unique plan identifier */
  id: string;
  /** Display name */
  name: string;
  /** Price amount (in dollars/base currency) */
  price: number;
  /** Billing interval */
  interval: "month" | "year";
  /** Short description */
  description: string;
  /** List of included features */
  features: string[];
  /** Stripe price ID for checkout */
  priceId: string;
  /** Whether this plan is highlighted/recommended */
  highlighted?: boolean;
}

export interface PricingTableProps {
  /** Array of plans to display */
  plans: PricingPlan[];
  /** Callback when user selects a plan (receives priceId and planId) */
  onSelectPlan?: (priceId: string, planId: string) => void;
  /** Custom CTA button text */
  ctaText?: string;
  /** Additional CSS class */
  className?: string;
}

/**
 * PricingTable component.
 * Renders pricing cards with plan name, price, features, and CTA.
 * Stripe checkout pre-connected to each button via onSelectPlan.
 */
export function PricingTable({
  plans,
  onSelectPlan,
  ctaText = "Get Started",
  className,
}: PricingTableProps): React.JSX.Element {
  if (plans.length === 0) {
    return (
      <div
        className={["pricing-table-empty", className].filter(Boolean).join(" ")}
      >
        <p>No plans available</p>
      </div>
    );
  }

  const classes = ["pricing-table", className].filter(Boolean).join(" ");

  return (
    <section className={classes} aria-label="Pricing plans">
      <div className="pricing-grid">
        {plans.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
            ctaText={ctaText}
            onSelect={onSelectPlan}
          />
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Internal PricingCard
// ---------------------------------------------------------------------------

interface PricingCardProps {
  plan: PricingPlan;
  ctaText: string;
  onSelect?: (priceId: string, planId: string) => void;
}

function PricingCard({
  plan,
  ctaText,
  onSelect,
}: PricingCardProps): React.JSX.Element {
  const cardClasses = [
    "pricing-card",
    plan.highlighted ? "pricing-card-highlighted" : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  const handleClick = () => {
    onSelect?.(plan.priceId, plan.id);
  };

  return (
    <article className={cardClasses}>
      <header className="pricing-card-header">
        <h3 className="pricing-card-name">{plan.name}</h3>
        <p className="pricing-card-description">{plan.description}</p>
      </header>

      <div className="pricing-card-price">
        <span className="pricing-amount">${plan.price}</span>
        <span className="pricing-interval">/{plan.interval}</span>
      </div>

      <ul className="pricing-card-features" role="list">
        {plan.features.map((feature) => (
          <li key={feature} className="pricing-feature">
            <span className="pricing-feature-check" aria-hidden="true">
              &#10003;
            </span>
            {feature}
          </li>
        ))}
      </ul>

      <button
        type="button"
        className={`btn ${plan.highlighted ? "btn-primary" : "btn-secondary"}`}
        onClick={handleClick}
      >
        {ctaText}
      </button>
    </article>
  );
}
