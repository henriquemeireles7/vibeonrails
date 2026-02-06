import React, { useState, useMemo } from "react";

// ---------------------------------------------------------------------------
// DataTable — Sortable table with pagination
// ---------------------------------------------------------------------------

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  emptyMessage?: string;
  className?: string;
  getRowKey: (row: T) => string;
}

type SortDir = "asc" | "desc" | null;

export function DataTable<T>({
  columns,
  data,
  pageSize = 10,
  emptyMessage = "No data",
  className,
  getRowKey,
}: DataTableProps<T>) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);

  const sorted = useMemo(() => {
    if (!sortCol || !sortDir) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortCol];
      const bVal = (b as Record<string, unknown>)[sortCol];
      if (aVal == null || bVal == null) return 0;
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize);

  function toggleSort(key: string) {
    if (sortCol === key) {
      setSortDir((d) => (d === "asc" ? "desc" : d === "desc" ? null : "asc"));
      if (sortDir === "desc") setSortCol(null);
    } else {
      setSortCol(key);
      setSortDir("asc");
    }
    setPage(0);
  }

  if (data.length === 0) {
    return (
      <div
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
    <div className={className}>
      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "var(--text-sm)",
          }}
        >
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                  style={{
                    textAlign: "left",
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: "2px solid var(--color-border)",
                    fontWeight: "var(--font-semibold)",
                    color: "var(--color-text-secondary)",
                    cursor: col.sortable ? "pointer" : "default",
                    userSelect: col.sortable ? "none" : undefined,
                    whiteSpace: "nowrap",
                  }}
                >
                  {col.header}
                  {col.sortable && sortCol === col.key && (
                    <span style={{ marginLeft: "var(--space-1)" }}>
                      {sortDir === "asc" ? "\u2191" : "\u2193"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr key={getRowKey(row)}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "var(--space-3) var(--space-4)",
                      borderBottom: "1px solid var(--color-border)",
                      color: "var(--color-text)",
                    }}
                  >
                    {col.render
                      ? col.render(row)
                      : String(
                          (row as Record<string, unknown>)[col.key] ?? "",
                        )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "var(--space-3) var(--space-4)",
            fontSize: "var(--text-sm)",
            color: "var(--color-text-secondary)",
          }}
        >
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: "var(--space-2)" }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              Previous
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

DataTable.displayName = "DataTable";
