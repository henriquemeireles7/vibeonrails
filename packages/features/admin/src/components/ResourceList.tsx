import React, { useState } from "react";
import type { ResourceConfig } from "../config.js";

export interface ResourceListProps {
  resource: ResourceConfig;
  data: Record<string, unknown>[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCreate?: () => void;
}

/**
 * Auto-generated list view with search, pagination.
 */
export function ResourceList({ resource, data, onEdit, onDelete, onCreate }: ResourceListProps) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const filtered = resource.searchable
    ? data.filter((item) =>
        resource.columns.some((col) =>
          String(item[col.key] ?? "").toLowerCase().includes(search.toLowerCase()),
        ),
      )
    : data;

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2>{resource.name}</h2>
        {resource.createable && onCreate && (
          <button onClick={onCreate}>Create New</button>
        )}
      </div>

      {resource.searchable && (
        <input
          type="text"
          placeholder={`Search ${resource.name}...`}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          style={{ marginBottom: "1rem", padding: "0.5rem", width: "100%" }}
        />
      )}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {resource.columns.map((col) => (
              <th key={col.key} style={{ textAlign: "left", padding: "0.5rem", borderBottom: "2px solid #e5e7eb" }}>
                {col.label}
              </th>
            ))}
            <th style={{ textAlign: "right", padding: "0.5rem", borderBottom: "2px solid #e5e7eb" }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {paged.map((item, i) => (
            <tr key={i}>
              {resource.columns.map((col) => (
                <td key={col.key} style={{ padding: "0.5rem", borderBottom: "1px solid #f3f4f6" }}>
                  {String(item[col.key] ?? "")}
                </td>
              ))}
              <td style={{ textAlign: "right", padding: "0.5rem", borderBottom: "1px solid #f3f4f6" }}>
                {resource.editable && onEdit && (
                  <button onClick={() => onEdit(String(item["id"]))}>Edit</button>
                )}
                {resource.deleteable && onDelete && (
                  <button onClick={() => onDelete(String(item["id"]))} style={{ marginLeft: "0.5rem" }}>
                    Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div style={{ marginTop: "1rem", display: "flex", gap: "0.5rem" }}>
          <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</button>
          <span>Page {page + 1} of {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
