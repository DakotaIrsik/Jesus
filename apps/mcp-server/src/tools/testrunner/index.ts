import { TestRunnerGuard } from './guards.js';
import { TestRunnerOperations } from './operations.js';
import type { TestRunnerConfig } from './types.js';

export function createTestRunnerTool(config: TestRunnerConfig) {
  const guard = new TestRunnerGuard(config);
  const operations = new TestRunnerOperations(guard);

  return {
    guard,
    operations,
  };
}

export type {
  TestRunnerConfig,
  RunTestsRequest,
  GetCoverageRequest,
  ToolResult,
} from './types.js';
export { TestRunnerGuard } from './guards.js';
export { TestRunnerOperations } from './operations.js';
