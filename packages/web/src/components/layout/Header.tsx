import React from "react";

// ---------------------------------------------------------------------------
// Header — App header with logo, navigation, and user menu slot
// ---------------------------------------------------------------------------

export interface HeaderProps {
  logo?: React.ReactNode;
  nav?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function Header({ logo, nav, actions, className }: HeaderProps) {
  const headerClasses = ["row-between", className].filter(Boolean).join(" ");

  return (
    <header
      className={headerClasses}
      style={{
        padding: "var(--space-3) var(--space-6)",
        borderBottom: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg)",
        position: "sticky",
        top: 0,
        zIndex: "var(--z-sticky)",
      }}
    >
      <div className="row gap-6">
        {logo && (
          <div style={{ fontWeight: "var(--font-bold)", fontSize: "var(--text-lg)" }}>
            {logo}
          </div>
        )}
        {nav && <nav className="row gap-4">{nav}</nav>}
      </div>
      {actions && <div className="row gap-3">{actions}</div>}
    </header>
  );
}

Header.displayName = "Header";
