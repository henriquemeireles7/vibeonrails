// VOR: Multi-project companion support
// One OpenClaw instance serves multiple VoR projects.
// Project-specific skills installed per project.
// Context switching based on Discord channel or explicit project name.

import type { OpenClawInstance } from "./provision.js";

/**
 * A registered VoR project within the companion.
 */
export interface CompanionProject {
  /** Unique project identifier */
  id: string;
  /** Human-readable project name */
  name: string;
  /** Absolute path to project root */
  projectPath: string;
  /** Discord channel mappings for this project */
  channels: ChannelMapping;
  /** Skills installed for this project */
  skills: string[];
  /** Whether this is the default project */
  isDefault: boolean;
}

/**
 * Discord channel to project mapping.
 */
export interface ChannelMapping {
  general?: string;
  marketing?: string;
  support?: string;
  finance?: string;
  deployments?: string;
  contentReview?: string;
}

/**
 * Multi-project configuration stored in OpenClaw.
 */
export interface MultiProjectConfig {
  projects: CompanionProject[];
  defaultProjectId: string;
}

/**
 * Result of registering a project.
 */
export interface RegisterResult {
  registered: boolean;
  projectId: string;
  error?: string;
}

/**
 * Result of resolving which project a message belongs to.
 */
export interface ProjectResolution {
  resolved: boolean;
  project?: CompanionProject;
  method: "channel" | "explicit" | "default" | "unresolved";
}

// ---------------------------------------------------------------------------
// Project Registration
// ---------------------------------------------------------------------------

/**
 * Register a VoR project with the companion.
 * Stores project metadata and channel mappings in the multi-project config.
 */
export function registerProject(
  config: MultiProjectConfig,
  project: Omit<CompanionProject, "isDefault">,
): { config: MultiProjectConfig; result: RegisterResult } {
  // Check for duplicate project ID
  const existing = config.projects.find((p) => p.id === project.id);
  if (existing) {
    return {
      config,
      result: {
        registered: false,
        projectId: project.id,
        error: `Project "${project.id}" is already registered`,
      },
    };
  }

  const isDefault = config.projects.length === 0;
  const newProject: CompanionProject = {
    ...project,
    isDefault,
  };

  const updatedConfig: MultiProjectConfig = {
    projects: [...config.projects, newProject],
    defaultProjectId: isDefault ? project.id : config.defaultProjectId,
  };

  return {
    config: updatedConfig,
    result: {
      registered: true,
      projectId: project.id,
    },
  };
}

/**
 * Remove a project from the multi-project config.
 */
export function removeProject(
  config: MultiProjectConfig,
  projectId: string,
): MultiProjectConfig {
  const filtered = config.projects.filter((p) => p.id !== projectId);

  // If we removed the default, make the first remaining project default
  let defaultId = config.defaultProjectId;
  if (defaultId === projectId && filtered.length > 0) {
    defaultId = filtered[0].id;
    filtered[0] = { ...filtered[0], isDefault: true };
  }

  return {
    projects: filtered,
    defaultProjectId: filtered.length > 0 ? defaultId : "",
  };
}

// ---------------------------------------------------------------------------
// Project Resolution
// ---------------------------------------------------------------------------

/**
 * Resolve which project a message belongs to.
 * Priority: explicit mention > channel mapping > default project.
 */
export function resolveProject(
  config: MultiProjectConfig,
  context: {
    channelId?: string;
    explicitProjectName?: string;
  },
): ProjectResolution {
  // 1. Explicit project name mention
  if (context.explicitProjectName) {
    const project = config.projects.find(
      (p) =>
        p.name.toLowerCase() === context.explicitProjectName!.toLowerCase() ||
        p.id === context.explicitProjectName,
    );

    if (project) {
      return { resolved: true, project, method: "explicit" };
    }
  }

  // 2. Channel-based resolution
  if (context.channelId) {
    for (const project of config.projects) {
      const channelValues = Object.values(project.channels);
      if (channelValues.includes(context.channelId)) {
        return { resolved: true, project, method: "channel" };
      }
    }
  }

  // 3. Default project
  const defaultProject = config.projects.find(
    (p) => p.id === config.defaultProjectId,
  );
  if (defaultProject) {
    return { resolved: true, project: defaultProject, method: "default" };
  }

  return { resolved: false, method: "unresolved" };
}

/**
 * Set a project as the default.
 */
export function setDefaultProject(
  config: MultiProjectConfig,
  projectId: string,
): MultiProjectConfig {
  const project = config.projects.find((p) => p.id === projectId);
  if (!project) return config;

  const updatedProjects = config.projects.map((p) => ({
    ...p,
    isDefault: p.id === projectId,
  }));

  return {
    projects: updatedProjects,
    defaultProjectId: projectId,
  };
}

/**
 * List all registered projects.
 */
export function listProjects(config: MultiProjectConfig): CompanionProject[] {
  return [...config.projects];
}

/**
 * Create an empty multi-project config.
 */
export function createEmptyConfig(): MultiProjectConfig {
  return {
    projects: [],
    defaultProjectId: "",
  };
}
