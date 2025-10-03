import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { GitHubGuard } from './guards.js';
import type {
  CreateIssueRequest,
  UpdateIssueRequest,
  CreateCommentRequest,
  ListIssuesRequest,
  CreatePullRequestRequest,
  ManageLabelsRequest,
  ToolResult,
  AuditLogEntry,
} from './types.js';

const execFileAsync = promisify(execFile);

export class GitHubOperations {
  private auditLog: AuditLogEntry[] = [];

  constructor(private guard: GitHubGuard) {}

  private logOperation(
    operation: string,
    parameters: unknown,
    result: 'success' | 'failure' | 'dry-run',
    error?: string
  ): void {
    if (this.guard.isAuditLogEnabled()) {
      this.auditLog.push({
        timestamp: new Date().toISOString(),
        operation,
        parameters,
        result,
        error,
      });
    }
  }

  getAuditLog(): AuditLogEntry[] {
    return [...this.auditLog];
  }

  clearAuditLog(): void {
    this.auditLog = [];
  }

  private async executeGhCommand(args: string[]): Promise<ToolResult> {
    try {
      const { stdout, stderr } = await execFileAsync('gh', args);
      return { success: true, data: { output: stdout, stderr } };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error executing gh command',
      };
    }
  }

  async createIssue(request: CreateIssueRequest): Promise<ToolResult> {
    const rateLimit = this.guard.checkRateLimit('createIssue');
    if (!rateLimit.allowed) {
      const error = `Rate limit exceeded. Reset at ${new Date(rateLimit.info.reset * 1000).toISOString()}`;
      this.logOperation('createIssue', request, 'failure', error);
      return { success: false, error };
    }

    const isDryRun = this.guard.isDryRunMode() || request.dryRun;
    if (isDryRun) {
      const dryRunResult = {
        success: true,
        data: { output: `[dryRun] Would create issue: ${request.title}`, request },
      };
      this.logOperation('createIssue', request, 'dry-run');
      return dryRunResult;
    }

    const args = ['issue', 'create', '--title', request.title];
    if (request.body) args.push('--body', request.body);
    if (request.labels && request.labels.length > 0) {
      request.labels.forEach((label) => args.push('--label', label));
    }
    if (request.assignees && request.assignees.length > 0) {
      request.assignees.forEach((assignee) => args.push('--assignee', assignee));
    }
    if (request.milestone) args.push('--milestone', request.milestone.toString());

    const result = await this.executeGhCommand(args);
    this.logOperation('createIssue', request, result.success ? 'success' : 'failure', result.error);
    return result;
  }

  async updateIssue(request: UpdateIssueRequest): Promise<ToolResult> {
    const rateLimit = this.guard.checkRateLimit('updateIssue');
    if (!rateLimit.allowed) {
      const error = `Rate limit exceeded. Reset at ${new Date(rateLimit.info.reset * 1000).toISOString()}`;
      this.logOperation('updateIssue', request, 'failure', error);
      return { success: false, error };
    }

    const isDryRun = this.guard.isDryRunMode() || request.dryRun;
    if (isDryRun) {
      const dryRunResult = {
        success: true,
        data: { output: `[dryRun] Would update issue #${request.issueNumber}`, request },
      };
      this.logOperation('updateIssue', request, 'dry-run');
      return dryRunResult;
    }

    const args = ['issue', 'edit', request.issueNumber.toString()];
    if (request.title) args.push('--title', request.title);
    if (request.body !== undefined) args.push('--body', request.body);
    if (request.state) args.push('--state', request.state);
    if (request.assignees && request.assignees.length > 0) {
      request.assignees.forEach((assignee) => args.push('--add-assignee', assignee));
    }

    const result = await this.executeGhCommand(args);
    this.logOperation('updateIssue', request, result.success ? 'success' : 'failure', result.error);
    return result;
  }

  async createComment(request: CreateCommentRequest): Promise<ToolResult> {
    const rateLimit = this.guard.checkRateLimit('createComment');
    if (!rateLimit.allowed) {
      const error = `Rate limit exceeded. Reset at ${new Date(rateLimit.info.reset * 1000).toISOString()}`;
      this.logOperation('createComment', request, 'failure', error);
      return { success: false, error };
    }

    const isDryRun = this.guard.isDryRunMode() || request.dryRun;
    if (isDryRun) {
      const dryRunResult = {
        success: true,
        data: { output: `[dryRun] Would comment on issue #${request.issueNumber}`, request },
      };
      this.logOperation('createComment', request, 'dry-run');
      return dryRunResult;
    }

    const args = ['issue', 'comment', request.issueNumber.toString(), '--body', request.body];

    const result = await this.executeGhCommand(args);
    this.logOperation('createComment', request, result.success ? 'success' : 'failure', result.error);
    return result;
  }

  async listIssues(request: ListIssuesRequest): Promise<ToolResult> {
    const rateLimit = this.guard.checkRateLimit('listIssues');
    if (!rateLimit.allowed) {
      const error = `Rate limit exceeded. Reset at ${new Date(rateLimit.info.reset * 1000).toISOString()}`;
      this.logOperation('listIssues', request, 'failure', error);
      return { success: false, error };
    }

    const args = ['issue', 'list', '--json', 'number,title,state,labels,assignees'];
    if (request.state) args.push('--state', request.state);
    if (request.labels && request.labels.length > 0) {
      args.push('--label', request.labels.join(','));
    }
    if (request.assignee) args.push('--assignee', request.assignee);
    if (request.per_page) args.push('--limit', request.per_page.toString());

    try {
      const { stdout } = await execFileAsync('gh', args);
      const issues = JSON.parse(stdout);
      const result = { success: true, data: { issues } };
      this.logOperation('listIssues', request, 'success');
      return result;
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to list issues';
      this.logOperation('listIssues', request, 'failure', errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  async createPullRequest(request: CreatePullRequestRequest): Promise<ToolResult> {
    const rateLimit = this.guard.checkRateLimit('createPullRequest');
    if (!rateLimit.allowed) {
      const error = `Rate limit exceeded. Reset at ${new Date(rateLimit.info.reset * 1000).toISOString()}`;
      this.logOperation('createPullRequest', request, 'failure', error);
      return { success: false, error };
    }

    const isDryRun = this.guard.isDryRunMode() || request.dryRun;
    if (isDryRun) {
      const dryRunResult = {
        success: true,
        data: { output: `[dryRun] Would create PR: ${request.title}`, request },
      };
      this.logOperation('createPullRequest', request, 'dry-run');
      return dryRunResult;
    }

    const args = ['pr', 'create', '--title', request.title, '--head', request.head];
    if (request.base) args.push('--base', request.base);
    if (request.body) args.push('--body', request.body);
    if (request.draft) args.push('--draft');
    if (request.labels && request.labels.length > 0) {
      request.labels.forEach((label) => args.push('--label', label));
    }
    if (request.assignees && request.assignees.length > 0) {
      request.assignees.forEach((assignee) => args.push('--assignee', assignee));
    }
    if (request.milestone) args.push('--milestone', request.milestone.toString());

    const result = await this.executeGhCommand(args);
    this.logOperation('createPullRequest', request, result.success ? 'success' : 'failure', result.error);
    return result;
  }

  async manageLabels(request: ManageLabelsRequest): Promise<ToolResult> {
    const rateLimit = this.guard.checkRateLimit('manageLabels');
    if (!rateLimit.allowed) {
      const error = `Rate limit exceeded. Reset at ${new Date(rateLimit.info.reset * 1000).toISOString()}`;
      this.logOperation('manageLabels', request, 'failure', error);
      return { success: false, error };
    }

    const isDryRun = this.guard.isDryRunMode() || request.dryRun;
    if (isDryRun) {
      const dryRunResult = {
        success: true,
        data: { output: `[dryRun] Would ${request.action} labels on #${request.issueNumber}`, request },
      };
      this.logOperation('manageLabels', request, 'dry-run');
      return dryRunResult;
    }

    const args = ['issue', 'edit', request.issueNumber.toString()];

    switch (request.action) {
      case 'add':
        request.labels.forEach((label) => args.push('--add-label', label));
        break;
      case 'remove':
        request.labels.forEach((label) => args.push('--remove-label', label));
        break;
      case 'set':
        args.push('--label', request.labels.join(','));
        break;
    }

    const result = await this.executeGhCommand(args);
    this.logOperation('manageLabels', request, result.success ? 'success' : 'failure', result.error);
    return result;
  }
}
