export * from './types.js';
export * from './guards.js';
export * from './operations.js';

import { GitHubGuard } from './guards.js';
import { GitHubOperations } from './operations.js';
import type { GitHubConfig } from './types.js';

/**
 * Factory function to create GitHub tool with configured security
 */
export function createGitHubTool(config: GitHubConfig) {
  const guard = new GitHubGuard(config);
  const operations = new GitHubOperations(guard);

  return {
    guard,
    operations,
    config,
  };
}
