import React, { useState } from "react";
import type { ResourceConfig } from "../config.js";

export interface ResourceFormProps {
  resource: ResourceConfig;
  initialData?: Record<string, unknown>;
  onSubmit: (data: Record<string, string>) => void;
  onCancel?: () => void;
}

/**
 * Auto-generated create/edit form from resource columns.
 */
export function ResourceForm({ resource, initialData, onSubmit, onCancel }: ResourceFormProps) {
  const [formData, setFormData] = useState<Record<string, string>>(
    resource.columns.reduce(
      (acc, col) => ({
        ...acc,
        [col.key]: String(initialData?.[col.key] ?? ""),
      }),
      {} as Record<string, string>,
    ),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>{initialData ? `Edit ${resource.name}` : `Create ${resource.name}`}</h2>

      {resource.columns.map((col) => (
        <div key={col.key} style={{ marginBottom: "1rem" }}>
          <label style={{ display: "block", marginBottom: "0.25rem", fontWeight: 500 }}>
            {col.label}
          </label>
          <input
            type="text"
            value={formData[col.key] ?? ""}
            onChange={(e) => setFormData((prev) => ({ ...prev, [col.key]: e.target.value }))}
            style={{ padding: "0.5rem", width: "100%" }}
          />
        </div>
      ))}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button type="submit">{initialData ? "Update" : "Create"}</button>
        {onCancel && (
          <button type="button" onClick={onCancel}>Cancel</button>
        )}
      </div>
    </form>
  );
}
