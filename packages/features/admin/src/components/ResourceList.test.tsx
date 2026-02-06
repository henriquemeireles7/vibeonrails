import { describe, it, expect } from "vitest";
import { defineResource, defineAdmin } from "../config.js";
import { generateAdminRoutes } from "../routes.js";

describe("Admin Config & Routes", () => {
  const resource = defineResource({
    name: "Users",
    path: "users",
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
    ],
  });

  it("defines a resource with defaults", () => {
    expect(resource.searchable).toBe(true);
    expect(resource.createable).toBe(true);
    expect(resource.editable).toBe(true);
    expect(resource.deleteable).toBe(true);
  });

  it("defines admin config", () => {
    const config = defineAdmin({
      title: "My Admin",
      basePath: "/admin",
      resources: [resource],
    });
    expect(config.title).toBe("My Admin");
    expect(config.resources).toHaveLength(1);
  });

  it("generates routes for resources", () => {
    const config = defineAdmin({
      title: "Admin",
      basePath: "/admin",
      resources: [resource],
    });
    const routes = generateAdminRoutes(config);
    expect(routes.length).toBeGreaterThanOrEqual(3);
    expect(routes.some((r) => r.type === "list")).toBe(true);
    expect(routes.some((r) => r.type === "create")).toBe(true);
    expect(routes.some((r) => r.type === "detail")).toBe(true);
  });

  it("generates edit route when editable", () => {
    const config = defineAdmin({
      title: "Admin",
      basePath: "/admin",
      resources: [resource],
    });
    const routes = generateAdminRoutes(config);
    expect(routes.some((r) => r.type === "edit")).toBe(true);
  });
});
