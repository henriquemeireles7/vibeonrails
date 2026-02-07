import React from "react";

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

export interface EmptyStateProps {
  /** Heading text */
  title: string;
  /** Descriptive text shown below the title */
  description?: string;
  /** Optional icon element shown above the title */
  icon?: React.ReactNode;
  /** Optional action element (e.g. a CTA button) */
  action?: React.ReactNode;
}

/**
 * Centered empty state placeholder with optional icon, title, description, and action.
 *
 * Use when a list or view has no data to display.
 */
export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "var(--space-12) var(--space-4)",
        gap: "var(--space-4)",
      }}
    >
      {icon && (
        <div
          style={{
            color: "var(--color-text-muted)",
            fontSize: "var(--text-4xl)",
          }}
        >
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: "var(--text-xl)",
          fontWeight: "var(--font-semibold)",
          color: "var(--color-text)",
          margin: 0,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: "var(--text-base)",
            color: "var(--color-text-secondary)",
            margin: 0,
            maxWidth: "24rem",
          }}
        >
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: "var(--space-2)" }}>{action}</div>}
    </div>
  );
}

EmptyState.displayName = "EmptyState";
