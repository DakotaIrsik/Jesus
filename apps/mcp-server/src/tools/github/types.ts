export interface GitHubConfig {
  dryRunMode: boolean;
  auditLog: boolean;
  maxRequestsPerMinute: number;
  allowedOperations: string[];
}

export interface CreateIssueRequest {
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
  dryRun?: boolean;
}

export interface UpdateIssueRequest {
  issueNumber: number;
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  labels?: string[];
  assignees?: string[];
  milestone?: number | null;
  dryRun?: boolean;
}

export interface CreateCommentRequest {
  issueNumber: number;
  body: string;
  dryRun?: boolean;
}

export interface ListIssuesRequest {
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
  assignee?: string;
  milestone?: number | string;
  sort?: 'created' | 'updated' | 'comments';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface CreatePullRequestRequest {
  title: string;
  body?: string;
  head: string;
  base?: string;
  draft?: boolean;
  labels?: string[];
  assignees?: string[];
  milestone?: number;
  dryRun?: boolean;
}

export interface ManageLabelsRequest {
  issueNumber: number;
  labels: string[];
  action: 'add' | 'remove' | 'set';
  dryRun?: boolean;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AuditLogEntry {
  timestamp: string;
  operation: string;
  parameters: unknown;
  result: 'success' | 'failure' | 'dry-run';
  error?: string;
}

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  reset: number;
}
