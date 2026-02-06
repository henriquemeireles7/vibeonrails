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

// Mock factories (legacy — prefer factories.ts for new code)
export {
  mockUser,
  mockPost,
  mockContact,
  resetMockCounters,
  type MockUser,
  type MockPost,
  type MockContact,
} from "./mocks.js";

// Factory helpers (Phase 8 — enhanced factories with module detection)
export {
  createUser,
  createPost,
  createOrder,
  createContact,
  createDeal,
  createProduct,
  createComment,
  createTicket,
  createMany,
  resetFactories,
  detectInstalledModules,
  getAvailableFactories,
  type FactoryUser,
  type FactoryPost,
  type FactoryOrder,
  type FactoryOrderItem,
  type FactoryAddress,
  type FactoryContact,
  type FactoryDeal,
  type FactoryProduct,
  type FactoryComment,
  type FactoryTicket,
} from "./factories.js";

// Transaction isolation (Phase 8 — rollback-per-test for integration tests)
export {
  withTestTransaction,
  createSavepoint,
  rollbackToSavepoint,
  releaseSavepoint,
  resetSavepointCounter,
  type TransactionContext,
  type IsolationOptions,
  type TransactionResult,
} from "./isolation.js";

// Assertions
export {
  assertFileExists,
  assertFileNotExists,
  assertFileContains,
  assertJsonHas,
  assertValidFrontmatter,
} from "./assertions.js";
