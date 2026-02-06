/**
 * Admin Panel Configuration
 */

export interface ResourceColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

export interface ResourceConfig {
  name: string;
  path: string;
  columns: ResourceColumn[];
  searchable?: boolean;
  createable?: boolean;
  editable?: boolean;
  deleteable?: boolean;
}

export interface AdminConfig {
  title: string;
  basePath: string;
  resources: ResourceConfig[];
}

/**
 * Define the admin panel configuration.
 */
export function defineAdmin(config: AdminConfig): AdminConfig {
  return {
    ...config,
    basePath: config.basePath ?? "/admin",
  };
}

/**
 * Define a resource for the admin panel.
 */
export function defineResource(config: ResourceConfig): ResourceConfig {
  return {
    searchable: true,
    createable: true,
    editable: true,
    deleteable: true,
    ...config,
  };
}
