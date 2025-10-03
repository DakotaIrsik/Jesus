import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  CreateCommentRequest,
  CreateIssueRequest,
  CreatePullRequestRequest,
  GitHubOperationResult,
  ListIssuesRequest,
  ManageLabelsRequest,
  UpdateIssueRequest,
  AuditEntry,
} from './types.js';
import type { GitHubGuard } from './guards.js';

const execFileAsync = promisify(execFile);

/**
 * GitHub operations implementation using gh CLI
 */
export class GitHubOperations {
  private guard: GitHubGuard;
  private auditLog: AuditEntry[] = [];

  constructor(guard: GitHubGuard) {
    this.guard = guard;
  }

  /**
   * Execute gh CLI command with error handling and rate limiting
   */
  private async executeGhCommand(
    args: string[],
    operation: string,
    dryRun = false
  ): Promise<{ stdout: string; stderr: string }> {
    // Check rate limit
    const { allowed, info } = this.guard.checkRateLimit(operation);
    if (!allowed) {
      throw new Error(
        `Rate limit exceeded for ${operation}. Limit: ${info.limit}/min, Reset in: ${
          info.reset - Math.floor(Date.now() / 1000)
        }s`
      );
    }

    // If dry-run mode, just return mock response
    if (dryRun || this.guard.isDryRunMode()) {
      return {
        stdout: JSON.stringify({ dryRun: true, command: `gh ${args.join(' ')}` }),
        stderr: '',
      };
    }

    try {
      const result = await execFileAsync('gh', args, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 1024 * 1024, // 1MB buffer
      });
      return result;
    } catch (error: any) {
      // Handle backoff if rate limit error from GitHub API
      if (error.message?.includes('rate limit')) {
        throw new Error('GitHub API rate limit exceeded. Please retry later.');
      }
      throw error;
    }
  }

  /**
   * Log audit entry
   */
  private logAudit(entry: AuditEntry): void {
    if (this.guard.isAuditEnabled()) {
      this.auditLog.push(entry);
      // In production, this would write to a persistent audit log
      console.log('[AUDIT]', JSON.stringify(entry));
    }
  }

  /**
   * Create audit entry from operation
   */
  private createAuditEntry(
    operation: string,
    parameters: Record<string, unknown>,
    result: 'success' | 'failure' | 'dry-run',
    error?: string
  ): AuditEntry {
    return {
      timestamp: new Date().toISOString(),
      operation,
      parameters,
      result,
      error,
    };
  }

  /**
   * Create a new issue
   */
  async createIssue(request: CreateIssueRequest): Promise<GitHubOperationResult> {
    const operation = 'issue.create';

    // Check permissions
    if (!this.guard.isOperationAllowed(operation)) {
      const auditEntry = this.createAuditEntry(operation, request, 'failure', 'Operation not allowed');
      this.logAudit(auditEntry);
      return {
        success: false,
        error: 'Operation not allowed by configuration',
        auditTrail: auditEntry,
      };
    }

    try {
      const args = ['issue', 'create', '--title', request.title];

      if (request.body) {
        args.push('--body', request.body);
      }

      if (request.labels && request.labels.length > 0) {
        args.push('--label', request.labels.join(','));
      }

      if (request.assignees && request.assignees.length > 0) {
        args.push('--assignee', request.assignees.join(','));
      }

      if (request.milestone) {
        args.push('--milestone', request.milestone.toString());
      }

      const { stdout } = await this.executeGhCommand(args, operation, request.dryRun);

      const auditEntry = this.createAuditEntry(
        operation,
        request,
        request.dryRun ? 'dry-run' : 'success'
      );
      this.logAudit(auditEntry);

      return {
        success: true,
        message: 'Issue created successfully',
        data: { output: stdout },
        dryRun: request.dryRun,
        auditTrail: auditEntry,
      };
    } catch (error: any) {
      const auditEntry = this.createAuditEntry(operation, request, 'failure', error.message);
      this.logAudit(auditEntry);
      return {
        success: false,
        error: error.message,
        auditTrail: auditEntry,
      };
    }
  }

  /**
   * Update an existing issue
   */
  async updateIssue(request: UpdateIssueRequest): Promise<GitHubOperationResult> {
    const operation = 'issue.update';

    if (!this.guard.isOperationAllowed(operation)) {
      const auditEntry = this.createAuditEntry(operation, request, 'failure', 'Operation not allowed');
      this.logAudit(auditEntry);
      return {
        success: false,
        error: 'Operation not allowed by configuration',
        auditTrail: auditEntry,
      };
    }

    try {
      const args = ['issue', 'edit', request.issueNumber.toString()];

      if (request.title) {
        args.push('--title', request.title);
      }

      if (request.body !== undefined) {
        args.push('--body', request.body);
      }

      if (request.state) {
        args.push('--state', request.state);
      }

      if (request.labels) {
        args.push('--label', request.labels.join(','));
      }

      if (request.assignees) {
        args.push('--assignee', request.assignees.join(','));
      }

      if (request.milestone !== undefined) {
        if (request.milestone === null) {
          args.push('--remove-milestone');
        } else {
          args.push('--milestone', request.milestone.toString());
        }
      }

      const { stdout } = await this.executeGhCommand(args, operation, request.dryRun);

      const auditEntry = this.createAuditEntry(
        operation,
        request,
        request.dryRun ? 'dry-run' : 'success'
      );
      this.logAudit(auditEntry);

      return {
        success: true,
        message: 'Issue updated successfully',
        data: { output: stdout },
        dryRun: request.dryRun,
        auditTrail: auditEntry,
      };
    } catch (error: any) {
      const auditEntry = this.createAuditEntry(operation, request, 'failure', error.message);
      this.logAudit(auditEntry);
      return {
        success: false,
        error: error.message,
        auditTrail: auditEntry,
      };
    }
  }

  /**
   * Add a comment to an issue or PR
   */
  async createComment(request: CreateCommentRequest): Promise<GitHubOperationResult> {
    const operation = 'issue.comment';

    if (!this.guard.isOperationAllowed(operation)) {
      const auditEntry = this.createAuditEntry(operation, request, 'failure', 'Operation not allowed');
      this.logAudit(auditEntry);
      return {
        success: false,
        error: 'Operation not allowed by configuration',
        auditTrail: auditEntry,
      };
    }

    try {
      const args = ['issue', 'comment', request.issueNumber.toString(), '--body', request.body];

      const { stdout } = await this.executeGhCommand(args, operation, request.dryRun);

      const auditEntry = this.createAuditEntry(
        operation,
        request,
        request.dryRun ? 'dry-run' : 'success'
      );
      this.logAudit(auditEntry);

      return {
        success: true,
        message: 'Comment added successfully',
        data: { output: stdout },
        dryRun: request.dryRun,
        auditTrail: auditEntry,
      };
    } catch (error: any) {
      const auditEntry = this.createAuditEntry(operation, request, 'failure', error.message);
      this.logAudit(auditEntry);
      return {
        success: false,
        error: error.message,
        auditTrail: auditEntry,
      };
    }
  }

  /**
   * Create a new pull request
   */
  async createPullRequest(request: CreatePullRequestRequest): Promise<GitHubOperationResult> {
    const operation = 'pr.create';

    if (!this.guard.isOperationAllowed(operation)) {
      const auditEntry = this.createAuditEntry(operation, request, 'failure', 'Operation not allowed');
      this.logAudit(auditEntry);
      return {
        success: false,
        error: 'Operation not allowed by configuration',
        auditTrail: auditEntry,
      };
    }

    try {
      const args = ['pr', 'create', '--title', request.title, '--head', request.head, '--base', request.base];

      if (request.body) {
        args.push('--body', request.body);
      }

      if (request.draft) {
        args.push('--draft');
      }

      if (request.labels && request.labels.length > 0) {
        args.push('--label', request.labels.join(','));
      }

      if (request.assignees && request.assignees.length > 0) {
        args.push('--assignee', request.assignees.join(','));
      }

      if (request.milestone) {
        args.push('--milestone', request.milestone.toString());
      }

      const { stdout } = await this.executeGhCommand(args, operation, request.dryRun);

      const auditEntry = this.createAuditEntry(
        operation,
        request,
        request.dryRun ? 'dry-run' : 'success'
      );
      this.logAudit(auditEntry);

      return {
        success: true,
        message: 'Pull request created successfully',
        data: { output: stdout },
        dryRun: request.dryRun,
        auditTrail: auditEntry,
      };
    } catch (error: any) {
      const auditEntry = this.createAuditEntry(operation, request, 'failure', error.message);
      this.logAudit(auditEntry);
      return {
        success: false,
        error: error.message,
        auditTrail: auditEntry,
      };
    }
  }

  /**
   * Manage labels on an issue or PR
   */
  async manageLabels(request: ManageLabelsRequest): Promise<GitHubOperationResult> {
    const operation = request.action === 'add' ? 'label.add' : 'label.remove';

    if (!this.guard.isOperationAllowed(operation)) {
      const auditEntry = this.createAuditEntry(operation, request, 'failure', 'Operation not allowed');
      this.logAudit(auditEntry);
      return {
        success: false,
        error: 'Operation not allowed by configuration',
        auditTrail: auditEntry,
      };
    }

    try {
      const args = ['issue', 'edit', request.issueNumber.toString()];

      if (request.action === 'add') {
        args.push('--add-label', request.labels.join(','));
      } else if (request.action === 'remove') {
        args.push('--remove-label', request.labels.join(','));
      } else {
        // set - replace all labels
        args.push('--label', request.labels.join(','));
      }

      const { stdout } = await this.executeGhCommand(args, operation, request.dryRun);

      const auditEntry = this.createAuditEntry(
        operation,
        request,
        request.dryRun ? 'dry-run' : 'success'
      );
      this.logAudit(auditEntry);

      return {
        success: true,
        message: `Labels ${request.action}ed successfully`,
        data: { output: stdout },
        dryRun: request.dryRun,
        auditTrail: auditEntry,
      };
    } catch (error: any) {
      const auditEntry = this.createAuditEntry(operation, request, 'failure', error.message);
      this.logAudit(auditEntry);
      return {
        success: false,
        error: error.message,
        auditTrail: auditEntry,
      };
    }
  }

  /**
   * List issues with filters
   */
  async listIssues(request: ListIssuesRequest): Promise<GitHubOperationResult> {
    const operation = 'issue.list';

    if (!this.guard.isOperationAllowed(operation)) {
      const auditEntry = this.createAuditEntry(operation, request, 'failure', 'Operation not allowed');
      this.logAudit(auditEntry);
      return {
        success: false,
        error: 'Operation not allowed by configuration',
        auditTrail: auditEntry,
      };
    }

    try {
      const args = [
        'issue',
        'list',
        '--state',
        request.state,
        '--json',
        'number,title,state,labels,assignees,createdAt,updatedAt',
      ];

      if (request.labels && request.labels.length > 0) {
        args.push('--label', request.labels.join(','));
      }

      if (request.assignee) {
        args.push('--assignee', request.assignee);
      }

      if (request.milestone !== undefined) {
        args.push('--milestone', request.milestone.toString());
      }

      args.push('--limit', request.per_page.toString());

      const { stdout } = await this.executeGhCommand(args, operation, false);

      const issues = JSON.parse(stdout);

      const auditEntry = this.createAuditEntry(operation, request, 'success');
      this.logAudit(auditEntry);

      return {
        success: true,
        message: `Found ${issues.length} issues`,
        data: { issues },
        auditTrail: auditEntry,
      };
    } catch (error: any) {
      const auditEntry = this.createAuditEntry(operation, request, 'failure', error.message);
      this.logAudit(auditEntry);
      return {
        success: false,
        error: error.message,
        auditTrail: auditEntry,
      };
    }
  }

  /**
   * Get audit log entries
   */
  getAuditLog(): ReadonlyArray<AuditEntry> {
    return this.auditLog;
  }

  /**
   * Clear audit log (useful for testing)
   */
  clearAuditLog(): void {
    this.auditLog = [];
  }
}
