import React, { useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// LiveRegion — Announces dynamic content to screen readers
// Uses aria-live to communicate updates without requiring focus.
// ---------------------------------------------------------------------------

export interface LiveRegionProps {
  /** The content to announce */
  children: React.ReactNode;
  /** Politeness level: polite waits for idle, assertive interrupts */
  mode?: "polite" | "assertive" | "off";
  /** Whether the entire region should be read as a whole */
  atomic?: boolean;
  /** Hide visually but keep accessible to screen readers */
  visuallyHidden?: boolean;
  /** Auto-clear the message after this many milliseconds */
  clearAfterMs?: number;
  /** Additional CSS class names */
  className?: string;
}

export function LiveRegion({
  children,
  mode = "polite",
  atomic = true,
  visuallyHidden = false,
  clearAfterMs,
  className,
}: LiveRegionProps) {
  const [content, setContent] = useState<React.ReactNode>(children);

  useEffect(() => {
    setContent(children);
  }, [children]);

  useEffect(() => {
    if (clearAfterMs && clearAfterMs > 0) {
      const timer = setTimeout(() => {
        setContent(null);
      }, clearAfterMs);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [clearAfterMs, children]);

  const role = mode === "assertive" ? "alert" : "status";

  const classes = [
    "live-region",
    visuallyHidden ? "sr-only" : undefined,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      role={role}
      aria-live={mode}
      aria-atomic={String(atomic)}
      className={classes}
    >
      {content}
    </div>
  );
}

LiveRegion.displayName = "LiveRegion";
