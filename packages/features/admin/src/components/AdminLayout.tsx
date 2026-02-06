import React from "react";
import type { AdminConfig } from "../config.js";

export interface AdminLayoutProps {
  config: AdminConfig;
  children: React.ReactNode;
}

/**
 * Admin panel layout with sidebar navigation.
 */
export function AdminLayout({ config, children }: AdminLayoutProps) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 240, borderRight: "1px solid #e5e7eb", padding: "1rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
          {config.title}
        </h2>
        <nav>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {config.resources.map((r) => (
              <li key={r.name} style={{ marginBottom: "0.5rem" }}>
                <a
                  href={`${config.basePath}/${r.path}`}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  {r.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: "1.5rem" }}>{children}</main>
    </div>
  );
}
