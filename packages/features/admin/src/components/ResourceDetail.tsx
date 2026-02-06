import React from "react";
import type { ResourceConfig } from "../config.js";

export interface ResourceDetailProps {
  resource: ResourceConfig;
  data: Record<string, unknown>;
  onEdit?: () => void;
  onBack?: () => void;
}

/**
 * Auto-generated detail view for a resource.
 */
export function ResourceDetail({ resource, data, onEdit, onBack }: ResourceDetailProps) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2>{resource.name} Detail</h2>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {onBack && <button onClick={onBack}>Back</button>}
          {resource.editable && onEdit && <button onClick={onEdit}>Edit</button>}
        </div>
      </div>

      <dl>
        {resource.columns.map((col) => (
          <div key={col.key} style={{ marginBottom: "0.75rem" }}>
            <dt style={{ fontWeight: 600, color: "#6b7280" }}>{col.label}</dt>
            <dd style={{ margin: 0 }}>{String(data[col.key] ?? "—")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
