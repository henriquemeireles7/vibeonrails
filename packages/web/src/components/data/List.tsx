import React from "react";

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

export interface ListItem {
  id: string;
  label: string;
  description?: string;
  trailing?: React.ReactNode;
}

export interface ListProps {
  items: ListItem[];
  onItemClick?: (id: string) => void;
  emptyMessage?: string;
  className?: string;
}

export function List({
  items,
  onItemClick,
  emptyMessage = "No items",
  className,
}: ListProps) {
  if (items.length === 0) {
    return (
      <div
        className={className}
        style={{
          padding: "var(--space-8)",
          textAlign: "center",
          color: "var(--color-text-muted)",
          fontSize: "var(--text-sm)",
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul
      className={className}
      style={{ listStyle: "none", margin: 0, padding: 0 }}
      role="list"
    >
      {items.map((item) => (
        <li
          key={item.id}
          onClick={onItemClick ? () => onItemClick(item.id) : undefined}
          role={onItemClick ? "button" : undefined}
          tabIndex={onItemClick ? 0 : undefined}
          onKeyDown={
            onItemClick
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onItemClick(item.id);
                  }
                }
              : undefined
          }
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-3) var(--space-4)",
            borderBottom: "1px solid var(--color-border)",
            cursor: onItemClick ? "pointer" : "default",
            transition: "background-color var(--duration-fast) var(--ease-default)",
          }}
        >
          <div>
            <div style={{ fontWeight: "var(--font-medium)", fontSize: "var(--text-sm)" }}>
              {item.label}
            </div>
            {item.description && (
              <div
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--color-text-muted)",
                  marginTop: "var(--space-1)",
                }}
              >
                {item.description}
              </div>
            )}
          </div>
          {item.trailing && <div>{item.trailing}</div>}
        </li>
      ))}
    </ul>
  );
}

List.displayName = "List";
