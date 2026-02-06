import React, { useCallback } from "react";

// ---------------------------------------------------------------------------
// SkipLink — Skip to main content link for keyboard navigation
// Auto-included in PageLayout. Hidden until focused via keyboard.
// ---------------------------------------------------------------------------

export interface SkipLinkProps {
  /** The target element ID to skip to (with #) */
  target?: string;
  /** Custom label text */
  label?: string;
  /** Additional CSS class names */
  className?: string;
}

export function SkipLink({
  target = "#main-content",
  label = "Skip to main content",
  className,
}: SkipLinkProps) {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      const targetId = target.replace("#", "");
      const element = document.getElementById(targetId);
      if (element) {
        element.focus();
        if (typeof element.scrollIntoView === "function") {
          element.scrollIntoView({ behavior: "smooth" });
        }
      }
    },
    [target],
  );

  const classes = ["skip-link", className].filter(Boolean).join(" ");

  return (
    <a href={target} className={classes} onClick={handleClick}>
      {label}
    </a>
  );
}

SkipLink.displayName = "SkipLink";
