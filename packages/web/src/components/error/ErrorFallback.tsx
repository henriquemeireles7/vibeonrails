/**
 * Error Fallback
 *
 * Friendly error UI displayed when an ErrorBoundary catches an error.
 * Shows a helpful message and a "Try Again" button to reset the boundary.
 *
 * Production mode hides the error stack trace. Development mode shows it
 * for debugging convenience.
 *
 * Usage:
 *   <ErrorFallback error={error} resetError={() => reset()} />
 */

import React from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ErrorFallbackProps {
  /** The error that was caught */
  error: Error;
  /** Function to reset the error boundary and retry rendering */
  resetError: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ErrorFallback({ error, resetError }: ErrorFallbackProps): React.ReactElement {
  const isDev = typeof process !== "undefined" && process.env?.NODE_ENV === "development";

  return (
    <div
      role="alert"
      style={{
        padding: "2rem",
        margin: "1rem",
        borderRadius: "0.5rem",
        border: "1px solid var(--color-danger, #ef4444)",
        backgroundColor: "var(--color-danger-bg, #fef2f2)",
        color: "var(--color-danger-text, #991b1b)",
        fontFamily: "var(--font-sans, system-ui, sans-serif)",
      }}
    >
      <h2
        style={{
          margin: "0 0 0.5rem 0",
          fontSize: "1.125rem",
          fontWeight: 600,
        }}
      >
        Something went wrong
      </h2>
      <p style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", opacity: 0.9 }}>
        An unexpected error occurred. Please try again or contact support if the
        problem persists.
      </p>

      {isDev && (
        <details style={{ marginBottom: "1rem" }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: "0.75rem",
              fontWeight: 500,
              opacity: 0.7,
            }}
          >
            Error details (development only)
          </summary>
          <pre
            style={{
              marginTop: "0.5rem",
              padding: "0.75rem",
              borderRadius: "0.25rem",
              backgroundColor: "var(--color-danger-pre-bg, #fee2e2)",
              fontSize: "0.75rem",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {error.message}
            {error.stack && `\n\n${error.stack}`}
          </pre>
        </details>
      )}

      <button
        type="button"
        onClick={resetError}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: "0.375rem",
          border: "1px solid var(--color-danger, #ef4444)",
          backgroundColor: "var(--color-danger, #ef4444)",
          color: "#fff",
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: "pointer",
        }}
      >
        Try Again
      </button>
    </div>
  );
}
