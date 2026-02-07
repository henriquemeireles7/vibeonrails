/**
 * Trial Abuse Prevention — Prevents users from creating multiple free trials.
 *
 * Normalizes email addresses (lowercase, trimmed) before checking
 * whether a user has already used their trial period.
 *
 * Usage:
 *   const guard = createTrialGuard({
 *     checkEmail: async (email) => db.hasTrialRecord(email),
 *   });
 *   const allowed = await guard.canStartTrial('user@example.com');
 */

/** Options for configuring the trial guard. */
export interface TrialGuardOptions {
  /**
   * Checks whether the given (normalized) email has already used a trial.
   * Returns true if the email already had a trial.
   */
  checkEmail: (email: string) => Promise<boolean>;
}

/** Trial guard interface for checking trial eligibility. */
export interface TrialGuard {
  /** Returns true if the email is eligible to start a trial (has not had one before). */
  canStartTrial(email: string): Promise<boolean>;
}

/**
 * Normalize an email address for consistent lookup.
 * Trims whitespace and converts to lowercase.
 *
 * @param email - Raw email address
 * @returns Normalized email string
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Create a trial guard that checks whether an email is eligible for a free trial.
 *
 * @param options - Configuration with the email check function
 * @returns TrialGuard instance
 */
export function createTrialGuard(options: TrialGuardOptions): TrialGuard {
  const { checkEmail } = options;

  return {
    async canStartTrial(email: string): Promise<boolean> {
      const normalized = normalizeEmail(email);
      const alreadyUsed = await checkEmail(normalized);
      return !alreadyUsed;
    },
  };
}
