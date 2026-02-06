import React from "react";

// ---------------------------------------------------------------------------
// PageLayout — Page layout with optional header + sidebar + content area
// ---------------------------------------------------------------------------

export interface PageLayoutProps {
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function PageLayout({
  header,
  sidebar,
  children,
  className,
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
      {header}
      <div style={{ display: "flex", flex: 1 }}>
        {sidebar}
        <main
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
