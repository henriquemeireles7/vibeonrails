import { describe, it, expect } from "vitest";
import { generateAdminRoutes } from "./routes.js";
import type { AdminRoute } from "./routes.js";
import type { AdminConfig, ResourceConfig } from "./config.js";

function makeConfig(
  resources: ResourceConfig[],
  basePath = "/admin",
): AdminConfig {
  return { title: "Test Admin", basePath, resources };
}

describe("generateAdminRoutes", () => {
  const usersResource: ResourceConfig = {
    name: "Users",
    path: "users",
    columns: [{ key: "name", label: "Name" }],
    searchable: true,
    createable: true,
    editable: true,
    deleteable: true,
  };

  it("generates list, create, detail, and edit routes for a standard resource", () => {
    const routes = generateAdminRoutes(makeConfig([usersResource]));

    expect(routes).toHaveLength(4);
    expect(routes.map((r) => r.type)).toEqual([
      "list",
      "create",
      "detail",
      "edit",
    ]);
  });

  it("uses correct paths with basePath", () => {
    const routes = generateAdminRoutes(makeConfig([usersResource]));

    expect(routes.find((r) => r.type === "list")?.path).toBe("/admin/users");
    expect(routes.find((r) => r.type === "create")?.path).toBe(
      "/admin/users/new",
    );
    expect(routes.find((r) => r.type === "detail")?.path).toBe(
      "/admin/users/:id",
    );
    expect(routes.find((r) => r.type === "edit")?.path).toBe(
      "/admin/users/:id/edit",
    );
  });

  it("uses custom basePath", () => {
    const routes = generateAdminRoutes(makeConfig([usersResource], "/cms"));

    expect(routes[0].path).toBe("/cms/users");
    expect(routes[1].path).toBe("/cms/users/new");
  });

  it("skips create route when createable is false", () => {
    const resource: ResourceConfig = {
      ...usersResource,
      createable: false,
    };
    const routes = generateAdminRoutes(makeConfig([resource]));

    expect(routes.some((r) => r.type === "create")).toBe(false);
    expect(routes).toHaveLength(3);
  });

  it("skips edit route when editable is false", () => {
    const resource: ResourceConfig = {
      ...usersResource,
      editable: false,
    };
    const routes = generateAdminRoutes(makeConfig([resource]));

    expect(routes.some((r) => r.type === "edit")).toBe(false);
    expect(routes).toHaveLength(3);
  });

  it("generates only list and detail for read-only resource", () => {
    const resource: ResourceConfig = {
      ...usersResource,
      createable: false,
      editable: false,
    };
    const routes = generateAdminRoutes(makeConfig([resource]));

    expect(routes).toHaveLength(2);
    expect(routes.map((r) => r.type)).toEqual(["list", "detail"]);
  });

  it("sets resource name on each route", () => {
    const routes = generateAdminRoutes(makeConfig([usersResource]));

    for (const route of routes) {
      expect(route.resource).toBe("Users");
    }
  });

  it("generates meaningful route names", () => {
    const routes = generateAdminRoutes(makeConfig([usersResource]));

    expect(routes.find((r) => r.type === "list")?.name).toBe("Users List");
    expect(routes.find((r) => r.type === "create")?.name).toBe("Create Users");
    expect(routes.find((r) => r.type === "detail")?.name).toBe("Users Detail");
    expect(routes.find((r) => r.type === "edit")?.name).toBe("Edit Users");
  });

  it("handles multiple resources", () => {
    const postsResource: ResourceConfig = {
      name: "Posts",
      path: "posts",
      columns: [],
      createable: true,
      editable: true,
    };
    const routes = generateAdminRoutes(
      makeConfig([usersResource, postsResource]),
    );

    const userRoutes = routes.filter((r) => r.resource === "Users");
    const postRoutes = routes.filter((r) => r.resource === "Posts");

    expect(userRoutes.length).toBeGreaterThan(0);
    expect(postRoutes.length).toBeGreaterThan(0);
    expect(routes.length).toBe(userRoutes.length + postRoutes.length);
  });

  it("returns empty array for empty resources", () => {
    const routes = generateAdminRoutes(makeConfig([]));
    expect(routes).toEqual([]);
  });

  it("satisfies AdminRoute type", () => {
    const routes: AdminRoute[] = generateAdminRoutes(
      makeConfig([usersResource]),
    );
    expect(routes[0].path).toBeDefined();
    expect(routes[0].name).toBeDefined();
    expect(routes[0].type).toBeDefined();
    expect(routes[0].resource).toBeDefined();
  });
});
