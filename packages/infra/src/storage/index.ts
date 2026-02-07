/**
 * Storage module barrel export
 */

export { createStorage, type StorageClient, type StorageConfig } from './client.js';
export {
  validateFileType,
  validateFileSize,
  COMMON_FILE_TYPES,
  DEFAULT_MAX_FILE_SIZE,
} from './validators.js';
export type { FileTypeResult } from './validators.js';
