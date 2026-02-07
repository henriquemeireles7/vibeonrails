import React from "react";

// ---------------------------------------------------------------------------
// 404 Not Found Page
// ---------------------------------------------------------------------------

export interface NotFoundProps {
  /** URL to navigate to when clicking "Go Home" (default: '/') */
  homeUrl?: string;
}

/**
 * 404 Not Found page component.
 *
 * Clean, centered layout using design tokens.
 */
export function NotFound({ homeUrl = "/" }: NotFoundProps) {
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
        404 - Page Not Found
      </h1>
      <p
        style={{
          fontSize: "var(--text-lg)",
          color: "var(--color-text-secondary)",
          margin: "0 0 var(--space-8) 0",
          maxWidth: "28rem",
        }}
      >
        The page you are looking for does not exist or has been moved.
      </p>
      <a
        href={homeUrl}
        style={{
          display: "inline-block",
          padding: "var(--space-3) var(--space-6)",
          backgroundColor: "var(--color-primary)",
          color: "var(--color-text-inverse)",
          borderRadius: "var(--radius-md)",
          textDecoration: "none",
          fontSize: "var(--text-base)",
          fontWeight: "var(--font-medium)",
          transition: `background-color var(--duration-fast) var(--ease-default)`,
        }}
      >
        Go Home
      </a>
    </div>
  );
}

NotFound.displayName = "NotFound";
