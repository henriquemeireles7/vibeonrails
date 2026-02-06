import React from "react";

// ---------------------------------------------------------------------------
// Sidebar — Navigation sidebar
// ---------------------------------------------------------------------------

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  active?: boolean;
}

export interface SidebarProps {
  items: SidebarItem[];
  onItemClick?: (id: string) => void;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function Sidebar({
  items,
  onItemClick,
  header,
  footer,
  className,
}: SidebarProps) {
  const sidebarClasses = ["stack", className].filter(Boolean).join(" ");

  return (
    <aside
      className={sidebarClasses}
      style={{
        width: "16rem",
        borderRight: "1px solid var(--color-border)",
        backgroundColor: "var(--color-bg-subtle)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {header && (
        <div
          style={{
            padding: "var(--space-4) var(--space-4)",
            borderBottom: "1px solid var(--color-border)",
          }}
        >
          {header}
        </div>
      )}
      <nav style={{ flex: 1, padding: "var(--space-2)" }}>
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onItemClick?.(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  width: "100%",
                  padding: "var(--space-2) var(--space-3)",
                  border: "none",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: item.active
                    ? "var(--color-primary-light)"
                    : "transparent",
                  color: item.active
                    ? "var(--color-primary)"
                    : "var(--color-text-secondary)",
                  fontSize: "var(--text-sm)",
                  fontWeight: item.active
                    ? "var(--font-medium)"
                    : "var(--font-normal)",
                  cursor: "pointer",
                  textAlign: "left",
                  transition:
                    "background-color var(--duration-fast) var(--ease-default)",
                }}
              >
                {item.icon && <span>{item.icon}</span>}
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>
      {footer && (
        <div
          style={{
            padding: "var(--space-4)",
            borderTop: "1px solid var(--color-border)",
          }}
        >
          {footer}
        </div>
      )}
    </aside>
  );
}

Sidebar.displayName = "Sidebar";
