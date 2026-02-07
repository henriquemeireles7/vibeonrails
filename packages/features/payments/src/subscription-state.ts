/**
 * Subscription State Machine
 *
 * Defines the valid lifecycle states of a subscription and the
 * allowed transitions between them. Invalid transitions are blocked
 * to prevent corrupted subscription states.
 *
 * States:
 *   trialing -> active -> past_due -> canceled -> expired
 *                active -> canceled (voluntary cancel)
 *                past_due -> active (payment recovered)
 *                past_due -> canceled (payment failed permanently)
 *
 * Usage:
 *   import { canTransition, assertTransition, SubscriptionStatus } from './subscription-state.js';
 *
 *   if (canTransition('trialing', 'active')) { ... }
 *   assertTransition('expired', 'active'); // throws SubscriptionStateError
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "unpaid";

// ---------------------------------------------------------------------------
// Transition Map
// ---------------------------------------------------------------------------

/**
 * Allowed state transitions. Each key is a source state, and its value
 * is the set of states it can transition to.
 */
const TRANSITIONS: Record<SubscriptionStatus, readonly SubscriptionStatus[]> = {
  // Incomplete: payment not yet confirmed during creation
  incomplete: ["active", "incomplete_expired"],
  incomplete_expired: [], // terminal state

  // Trial period
  trialing: ["active", "past_due", "canceled"],

  // Active subscription
  active: ["past_due", "canceled", "paused", "unpaid"],

  // Payment failed, retrying
  past_due: ["active", "canceled", "unpaid"],

  // Unpaid after all retry attempts
  unpaid: ["active", "canceled"],

  // Paused subscription (can resume)
  paused: ["active", "canceled"],

  // Canceled (may still have access until period end)
  canceled: ["expired", "active"],

  // Expired: terminal state (no reactivation without new subscription)
  expired: [],
};

// ---------------------------------------------------------------------------
// Error
// ---------------------------------------------------------------------------

export class SubscriptionStateError extends Error {
  readonly from: SubscriptionStatus;
  readonly to: SubscriptionStatus;

  constructor(from: SubscriptionStatus, to: SubscriptionStatus) {
    super(
      `Invalid subscription state transition: "${from}" -> "${to}". ` +
      `Allowed transitions from "${from}": [${TRANSITIONS[from].join(", ")}]`,
    );
    this.name = "SubscriptionStateError";
    this.from = from;
    this.to = to;
  }
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Check if a state transition is valid.
 */
export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

/**
 * Assert that a state transition is valid. Throws SubscriptionStateError if not.
 */
export function assertTransition(from: SubscriptionStatus, to: SubscriptionStatus): void {
  if (!canTransition(from, to)) {
    throw new SubscriptionStateError(from, to);
  }
}

/**
 * Get the list of valid transitions from a given state.
 */
export function getValidTransitions(from: SubscriptionStatus): readonly SubscriptionStatus[] {
  return TRANSITIONS[from];
}

/**
 * Check if a status is a terminal state (no valid transitions out).
 */
export function isTerminalState(status: SubscriptionStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

/**
 * Check if a status represents an active/usable subscription.
 * Users in these states should have access to their plan features.
 */
export function isActiveStatus(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

/**
 * Check if a status represents a subscription with grace period access.
 * Users in these states may still have access but action is needed.
 */
export function hasGracePeriodAccess(status: SubscriptionStatus): boolean {
  return status === "past_due" || status === "canceled";
}
