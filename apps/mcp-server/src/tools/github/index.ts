import { GitHubGuard } from './guards.js';
import { GitHubOperations } from './operations.js';
import type { GitHubConfig } from './types.js';

export function createGitHubTool(config: GitHubConfig) {
  const guard = new GitHubGuard(config);
  const operations = new GitHubOperations(guard);

  return {
    guard,
    operations,
  };
}

export type {
  GitHubConfig,
  CreateIssueRequest,
  UpdateIssueRequest,
  CreateCommentRequest,
  ListIssuesRequest,
  CreatePullRequestRequest,
  ManageLabelsRequest,
  ToolResult,
  AuditLogEntry,
} from './types.js';
export { GitHubGuard } from './guards.js';
export { GitHubOperations } from './operations.js';
