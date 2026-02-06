import type { AdminConfig } from "./config.js";

export interface AdminRoute {
  path: string;
  name: string;
  type: "list" | "create" | "edit" | "detail";
  resource: string;
}

/**
 * Generate admin routes from config.
 */
export function generateAdminRoutes(config: AdminConfig): AdminRoute[] {
  const routes: AdminRoute[] = [];
  const base = config.basePath;

  for (const resource of config.resources) {
    routes.push({
      path: `${base}/${resource.path}`,
      name: `${resource.name} List`,
      type: "list",
      resource: resource.name,
    });

    if (resource.createable !== false) {
      routes.push({
        path: `${base}/${resource.path}/new`,
        name: `Create ${resource.name}`,
        type: "create",
        resource: resource.name,
      });
    }

    routes.push({
      path: `${base}/${resource.path}/:id`,
      name: `${resource.name} Detail`,
      type: "detail",
      resource: resource.name,
    });

    if (resource.editable !== false) {
      routes.push({
        path: `${base}/${resource.path}/:id/edit`,
        name: `Edit ${resource.name}`,
        type: "edit",
        resource: resource.name,
      });
    }
  }

  return routes;
}
