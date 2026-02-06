/**
 * @vibeonrails/marketing - Marketing Content Machine
 *
 * Three-stage autonomous content pipeline:
 * - Heuristics: Content primitives (7 types) stored as markdown
 * - Transform: AI-powered content generation from heuristics + channel prompts
 * - Channels: Post content via platform APIs, manage drafts/posted lifecycle
 *
 * Import from sub-paths for tree-shaking:
 *   import { loadHeuristics } from '@vibeonrails/marketing/heuristics';
 *   import { transformContent } from '@vibeonrails/marketing/transform';
 *   import { postContent } from '@vibeonrails/marketing/channels';
 */

export * from "./heuristics/index.js";
export * from "./transform/index.js";
export * from "./channels/index.js";
