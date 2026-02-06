/**
 * @vibeonrails/test-utils — Barrel exports
 *
 * Shared test utilities for the VoR ecosystem.
 */

// Fixtures
export { FixtureStore, type HttpFixture } from "./fixtures.js";

// Content helpers
export {
  createTempContent,
  createMarkdownFile,
  cleanupTempContent,
  type ContentFileSpec,
} from "./content.js";

// Mock factories
export {
  mockUser,
  mockPost,
  mockContact,
  resetMockCounters,
  type MockUser,
  type MockPost,
  type MockContact,
} from "./mocks.js";

// Assertions
export {
  assertFileExists,
  assertFileNotExists,
  assertFileContains,
  assertJsonHas,
  assertValidFrontmatter,
} from "./assertions.js";
