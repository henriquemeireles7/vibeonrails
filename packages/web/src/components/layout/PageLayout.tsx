import React from "react";
import { SkipLink } from "../a11y/skip-link.js";

// ---------------------------------------------------------------------------
// PageLayout — Page layout with optional header + sidebar + content area
// Auto-includes SkipLink for keyboard accessibility.
// ---------------------------------------------------------------------------

export interface PageLayoutProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  /** Disable the auto-included skip link */
  skipLink?: boolean;
  /** Custom skip link target (default: #main-content) */
  skipLinkTarget?: string;
}

export function PageLayout({
  header,
  sidebar,
  children,
  className,
  skipLink = true,
  skipLinkTarget,
}: PageLayoutProps) {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text)",
        fontFamily: "var(--font-sans)",
      }}
    >
      {skipLink && <SkipLink target={skipLinkTarget} />}
      {header}
      <div style={{ display: "flex", flex: 1 }}>
        {sidebar}
        <main
          id="main-content"
          tabIndex={-1}
          style={{
            flex: 1,
            padding: "var(--space-6)",
            overflowY: "auto",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

PageLayout.displayName = "PageLayout";
