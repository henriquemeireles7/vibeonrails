import React from "react";

// ---------------------------------------------------------------------------
// 500 Server Error Page
// ---------------------------------------------------------------------------

export interface ServerErrorProps {
  /** Custom callback for the retry button. Defaults to page reload. */
  onRetry?: () => void;
}

/**
 * 500 Server Error page component.
 *
 * Clean, centered layout with a retry button.
 */
export function ServerError({ onRetry }: ServerErrorProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "var(--space-8)",
        fontFamily: "var(--font-sans)",
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text)",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "var(--text-4xl)",
          fontWeight: "var(--font-bold)",
          margin: "0 0 var(--space-4) 0",
          color: "var(--color-text)",
        }}
      >
        500 - Something went wrong
      </h1>
      <p
        style={{
          fontSize: "var(--text-lg)",
          color: "var(--color-text-secondary)",
          margin: "0 0 var(--space-8) 0",
          maxWidth: "28rem",
        }}
      >
        An unexpected error occurred. Please try again later.
      </p>
      <button
        type="button"
        onClick={handleRetry}
        style={{
          padding: "var(--space-3) var(--space-6)",
          backgroundColor: "var(--color-primary)",
          color: "var(--color-text-inverse)",
          border: "none",
          borderRadius: "var(--radius-md)",
          fontSize: "var(--text-base)",
          fontWeight: "var(--font-medium)",
          cursor: "pointer",
          transition: `background-color var(--duration-fast) var(--ease-default)`,
        }}
      >
        Try Again
      </button>
    </div>
  );
}

ServerError.displayName = "ServerError";
