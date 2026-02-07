/**
 * Circuit Breaker — Prevents cascading failures by monitoring external calls.
 *
 * States:
 * - CLOSED: Normal operation. Failures are counted.
 * - OPEN: Calls are immediately rejected. After resetTimeout, transitions to HALF_OPEN.
 * - HALF_OPEN: One test call is allowed. Success closes the circuit; failure reopens it.
 *
 * Usage:
 *   const breaker = createCircuitBreaker({ name: 'payments-api' });
 *   const result = await breaker.execute(() => fetch('/api/charge'));
 */

/** Possible states of the circuit breaker. */
export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

/** Options for configuring a circuit breaker instance. */
export interface CircuitBreakerOptions {
  /** Descriptive name for this circuit breaker (used in errors/logs). */
  name: string;
  /** Number of consecutive failures before opening the circuit (default: 5). */
  failureThreshold?: number;
  /** Time in milliseconds before attempting to close an open circuit (default: 30000). */
  resetTimeout?: number;
}

/** Error thrown when the circuit breaker is open and rejecting requests. */
export class CircuitBreakerError extends Error {
  public readonly circuitName: string;
  public readonly state: CircuitBreakerState;

  constructor(name: string, state: CircuitBreakerState) {
    super(`Circuit breaker "${name}" is ${state} - request rejected`);
    this.name = "CircuitBreakerError";
    this.circuitName = name;
    this.state = state;
  }
}

/** Circuit breaker interface returned by createCircuitBreaker. */
export interface CircuitBreaker {
  /** Execute a function through the circuit breaker. */
  execute<T>(fn: () => Promise<T>): Promise<T>;
  /** Get the current state of the circuit breaker. */
  getState(): CircuitBreakerState;
  /** Get the current failure count. */
  getFailureCount(): number;
  /** Manually reset the circuit breaker to CLOSED state. */
  reset(): void;
}

/**
 * Create a circuit breaker that wraps async operations with failure tracking.
 *
 * @param options - Circuit breaker configuration
 * @returns CircuitBreaker instance
 */
export function createCircuitBreaker(options: CircuitBreakerOptions): CircuitBreaker {
  const {
    name,
    failureThreshold = 5,
    resetTimeout = 30_000,
  } = options;

  let state: CircuitBreakerState = "CLOSED";
  let failureCount = 0;
  let lastFailureTime = 0;

  function transitionToOpen(): void {
    state = "OPEN";
    lastFailureTime = Date.now();
  }

  function transitionToClosed(): void {
    state = "CLOSED";
    failureCount = 0;
    lastFailureTime = 0;
  }

  function shouldAttemptReset(): boolean {
    return Date.now() - lastFailureTime >= resetTimeout;
  }

  function onSuccess(): void {
    if (state === "HALF_OPEN") {
      transitionToClosed();
    }
    failureCount = 0;
  }

  function onFailure(): void {
    failureCount++;

    if (state === "HALF_OPEN") {
      transitionToOpen();
      return;
    }

    if (failureCount >= failureThreshold) {
      transitionToOpen();
    }
  }

  return {
    async execute<T>(fn: () => Promise<T>): Promise<T> {
      if (state === "OPEN") {
        if (shouldAttemptReset()) {
          state = "HALF_OPEN";
        } else {
          throw new CircuitBreakerError(name, state);
        }
      }

      try {
        const result = await fn();
        onSuccess();
        return result;
      } catch (error: unknown) {
        onFailure();
        throw error;
      }
    },

    getState(): CircuitBreakerState {
      return state;
    },

    getFailureCount(): number {
      return failureCount;
    },

    reset(): void {
      transitionToClosed();
    },
  };
}
