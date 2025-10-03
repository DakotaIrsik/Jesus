export * from './types.js';
export * from './guards.js';
export * from './operations.js';

import { FilesystemGuard } from './guards.js';
import { FilesystemOperations } from './operations.js';
import type { FilesystemConfig } from './types.js';

/**
 * Factory function to create filesystem tool with configured security
 */
export function createFilesystemTool(config: FilesystemConfig) {
  const guard = new FilesystemGuard(config);
  const operations = new FilesystemOperations(guard);

  return {
    guard,
    operations,
    config,
  };
}
