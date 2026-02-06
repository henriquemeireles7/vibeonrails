// ---------------------------------------------------------------------------
// defineRoutes — Type-safe route definition helper
// ---------------------------------------------------------------------------

export interface RouteConfig {
  path: string;
  label: string;
  protected?: boolean;
  children?: RouteConfig[];
}

/**
 * Define type-safe routes for your application.
 *
 * Usage:
 * ```ts
 * const routes = defineRoutes([
 *   { path: "/", label: "Home" },
 *   { path: "/login", label: "Login" },
 *   { path: "/dashboard", label: "Dashboard", protected: true },
 *   { path: "/posts", label: "Posts", protected: true, children: [
 *     { path: "/posts/:id", label: "Post Detail", protected: true },
 *   ]},
 * ]);
 * ```
 */
export function defineRoutes<T extends readonly RouteConfig[]>(
  routes: T,
): T {
  return routes;
}

/**
 * Get all flat route paths from a route tree.
 */
export function flattenRoutes(routes: RouteConfig[]): RouteConfig[] {
  const flat: RouteConfig[] = [];
  for (const route of routes) {
    flat.push(route);
    if (route.children) {
      flat.push(...flattenRoutes(route.children));
    }
  }
  return flat;
}

/**
 * Filter routes by protection status.
 */
export function getProtectedRoutes(routes: RouteConfig[]): RouteConfig[] {
  return flattenRoutes(routes).filter((r) => r.protected);
}

export function getPublicRoutes(routes: RouteConfig[]): RouteConfig[] {
  return flattenRoutes(routes).filter((r) => !r.protected);
}
