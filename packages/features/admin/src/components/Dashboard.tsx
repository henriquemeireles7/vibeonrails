import React from "react";
import type { AdminConfig } from "../config.js";

export interface DashboardStat {
  label: string;
  value: string | number;
}

export interface AdminDashboardProps {
  config: AdminConfig;
  stats?: DashboardStat[];
}

/**
 * Admin dashboard with overview stats.
 */
export function AdminDashboard({ config, stats = [] }: AdminDashboardProps) {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to the {config.title} admin panel.</p>

      {stats.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginTop: "1.5rem" }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ padding: "1.5rem", border: "1px solid #e5e7eb", borderRadius: "0.5rem" }}>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>{stat.label}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, marginTop: "0.25rem" }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <h2>Resources</h2>
        <ul>
          {config.resources.map((r) => (
            <li key={r.name}>
              <a href={`${config.basePath}/${r.path}`}>{r.name}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
