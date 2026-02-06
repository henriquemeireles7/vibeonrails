// Content
export { generateContent } from "./content/generate.js";
export type {
  ContentType,
  GenerateContentOptions,
  GeneratedContent,
} from "./content/generate.js";

// Social - Schedule
export { schedulePost, getScheduledPosts } from "./social/schedule.js";
export type { ScheduledPost } from "./social/schedule.js";

// Social - Platforms
export { definePlatform } from "./social/platforms.js";
export type { Platform, PlatformAdapter } from "./social/platforms.js";

// Sequences
export { defineSequence } from "./sequences/define.js";
export type { SequenceStep, EmailSequence } from "./sequences/define.js";

export { runSequence } from "./sequences/runner.js";
export type { SequenceStatus, SequenceRun } from "./sequences/runner.js";
