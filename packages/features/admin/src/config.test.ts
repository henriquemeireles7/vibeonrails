import { describe, it, expect } from "vitest";
import { defineAdmin, defineResource } from "./config.js";
import type { AdminConfig, ResourceConfig } from "./config.js";

describe("defineResource", () => {
  it("returns resource with all defaults enabled", () => {
    const resource = defineResource({
      name: "Users",
      path: "users",
      columns: [{ key: "name", label: "Name" }],
    });

    expect(resource.searchable).toBe(true);
    expect(resource.createable).toBe(true);
    expect(resource.editable).toBe(true);
    expect(resource.deleteable).toBe(true);
  });

  it("preserves explicitly disabled flags", () => {
    const resource = defineResource({
      name: "AuditLogs",
      path: "audit-logs",
      columns: [{ key: "action", label: "Action" }],
      createable: false,
      editable: false,
      deleteable: false,
    });

    expect(resource.createable).toBe(false);
    expect(resource.editable).toBe(false);
    expect(resource.deleteable).toBe(false);
    expect(resource.searchable).toBe(true);
  });

  it("preserves name, path, and columns", () => {
    const columns = [
      { key: "id", label: "ID", sortable: true },
      { key: "email", label: "Email" },
    ];
    const resource = defineResource({
      name: "Customers",
      path: "customers",
      columns,
    });

    expect(resource.name).toBe("Customers");
    expect(resource.path).toBe("customers");
    expect(resource.columns).toEqual(columns);
  });

  it("preserves sortable flag on columns", () => {
    const resource = defineResource({
      name: "Orders",
      path: "orders",
      columns: [
        { key: "total", label: "Total", sortable: true },
        { key: "status", label: "Status", sortable: false },
        { key: "note", label: "Note" },
      ],
    });

    expect(resource.columns[0].sortable).toBe(true);
    expect(resource.columns[1].sortable).toBe(false);
    expect(resource.columns[2].sortable).toBeUndefined();
  });
});

describe("defineAdmin", () => {
  const baseResource: ResourceConfig = {
    name: "Posts",
    path: "posts",
    columns: [{ key: "title", label: "Title" }],
  };

  it("returns config with provided values", () => {
    const config = defineAdmin({
      title: "My Admin",
      basePath: "/admin",
      resources: [baseResource],
    });

    expect(config.title).toBe("My Admin");
    expect(config.basePath).toBe("/admin");
    expect(config.resources).toHaveLength(1);
  });

  it("defaults basePath to /admin when omitted", () => {
    const config = defineAdmin({
      title: "Dashboard",
      basePath: undefined as unknown as string,
      resources: [],
    });

    // The nullish coalesce only triggers on null/undefined
    expect(config.basePath).toBe("/admin");
  });

  it("preserves custom basePath", () => {
    const config = defineAdmin({
      title: "CMS",
      basePath: "/cms",
      resources: [],
    });

    expect(config.basePath).toBe("/cms");
  });

  it("handles multiple resources", () => {
    const config = defineAdmin({
      title: "Admin",
      basePath: "/admin",
      resources: [
        { name: "Users", path: "users", columns: [] },
        { name: "Posts", path: "posts", columns: [] },
        { name: "Comments", path: "comments", columns: [] },
      ],
    });

    expect(config.resources).toHaveLength(3);
    expect(config.resources.map((r) => r.name)).toEqual([
      "Users",
      "Posts",
      "Comments",
    ]);
  });

  it("handles empty resources array", () => {
    const config = defineAdmin({
      title: "Empty Admin",
      basePath: "/admin",
      resources: [],
    });

    expect(config.resources).toHaveLength(0);
  });

  it("satisfies AdminConfig type", () => {
    const config: AdminConfig = defineAdmin({
      title: "Typed Admin",
      basePath: "/admin",
      resources: [baseResource],
    });

    expect(config).toBeDefined();
    expect(config.title).toBe("Typed Admin");
  });
});
