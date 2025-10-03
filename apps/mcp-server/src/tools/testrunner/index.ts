export * from './types.js';
export * from './guards.js';
export * from './operations.js';

import { TestRunnerGuard } from './guards.js';
import { TestRunnerOperations } from './operations.js';
import type { TestRunnerConfig } from './types.js';

/**
 * Factory function to create test runner tool with configured security
 */
export function createTestRunnerTool(config: TestRunnerConfig) {
  const guard = new TestRunnerGuard(config);
  const operations = new TestRunnerOperations(guard);

  return {
    guard,
    operations,
    config,
  };
}
