// Config
export { defineAdmin, defineResource } from "./config.js";
export type { AdminConfig, ResourceConfig, ResourceColumn } from "./config.js";

// Routes
export { generateAdminRoutes } from "./routes.js";
export type { AdminRoute } from "./routes.js";

// Components
export { AdminLayout } from "./components/AdminLayout.js";
export { ResourceList } from "./components/ResourceList.js";
export { ResourceForm } from "./components/ResourceForm.js";
export { ResourceDetail } from "./components/ResourceDetail.js";
export { AdminDashboard } from "./components/Dashboard.js";
export type { DashboardStat } from "./components/Dashboard.js";

// Hooks
export { createResourceManager } from "./hooks/useResource.js";
export type { UseResourceOptions } from "./hooks/useResource.js";
