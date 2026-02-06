/**
 * @vibeonrails/companion - OpenClaw Skills for VoR Business Operations
 *
 * Turn any OpenClaw instance into a VoR-aware autonomous business operator.
 * Skills cover: CLI commands, marketing, support, finance, analytics, x402.
 *
 * Setup: `vibe companion setup`
 */

// Provisioning
export {
  detectOpenClaw,
  provisionRailway,
  provisionDocker,
  connectExisting,
  installSkills,
} from "./provision.js";

export type {
  OpenClawInstance,
  DetectionResult,
  RailwayProvisionResult,
  DockerProvisionResult,
  DockerOptions,
  ConnectionResult,
  SkillInstallResult,
  InstallSkillsOptions,
  ProvisionResult,
} from "./provision.js";

// First Run
export {
  generateRandomName,
  buildIntroduction,
  postFirstRunIntroduction,
} from "./first-run.js";

export type {
  CompanionPersonality,
  IntroductionMessage,
  FirstRunResult,
  FirstRunOptions,
} from "./first-run.js";

// Multi-Project
export {
  registerProject,
  removeProject,
  resolveProject,
  setDefaultProject,
  listProjects,
  createEmptyConfig,
} from "./multi-project.js";

export type {
  CompanionProject,
  ChannelMapping,
  MultiProjectConfig,
  RegisterResult,
  ProjectResolution,
} from "./multi-project.js";
