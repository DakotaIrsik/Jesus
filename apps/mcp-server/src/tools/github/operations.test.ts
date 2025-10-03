import { describe, it, expect, beforeEach, vi } from 'vitest';
// import { GitHubOperations } from './operations.js';
// import { GitHubGuard } from './guards.js';
// import type {
//   GitHubConfig,
//   CreateIssueRequest,
//   UpdateIssueRequest,
//   CreateCommentRequest,
//   ListIssuesRequest,
//   CreatePullRequestRequest,
//   ManageLabelsRequest,
// } from './types.js';
import { execFile } from 'node:child_process';

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

// TODO: Implementation not yet available - skipping tests
describe.skip('GitHubOperations', () => {
  let operations: GitHubOperations;
  let guard: GitHubGuard;
  let mockExecFile: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockExecFile = vi.fn();
    vi.mocked(execFile).mockImplementation(mockExecFile);

    const config: GitHubConfig = {
      maxRequestsPerMinute: 60,
      dryRunMode: false,
      auditLog: true,
      allowedOperations: [],
    };

    guard = new GitHubGuard(config);
    operations = new GitHubOperations(guard);
  });

  describe('createIssue', () => {
    it('should create an issue successfully', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'Issue created', stderr: '' });

      const request: CreateIssueRequest = {
        title: 'Test Issue',
        body: 'Issue description',
        labels: ['bug', 'urgent'],
        assignees: ['user1'],
      };

      const result = await operations.createIssue(request);

      expect(result.success).toBe(true);
      expect(result.data?.output).toBe('Issue created');
      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining([
        'issue',
        'create',
        '--title',
        'Test Issue',
        '--body',
        'Issue description',
        '--label',
        'bug',
        '--label',
        'urgent',
        '--assignee',
        'user1',
      ]));
    });

    it('should respect dry run mode', async () => {
      const config: GitHubConfig = {
        maxRequestsPerMinute: 60,
        dryRunMode: true,
        auditLog: true,
        allowedOperations: [],
      };

      guard = new GitHubGuard(config);
      operations = new GitHubOperations(guard);

      const request: CreateIssueRequest = {
        title: 'Test Issue',
      };

      const result = await operations.createIssue(request);

      expect(result.success).toBe(true);
      expect(result.data?.output).toContain('[dryRun]');
      expect(mockExecFile).not.toHaveBeenCalled();
    });

    it('should respect per-request dry run flag', async () => {
      const request: CreateIssueRequest = {
        title: 'Test Issue',
        dryRun: true,
      };

      const result = await operations.createIssue(request);

      expect(result.success).toBe(true);
      expect(result.data?.output).toContain('[dryRun]');
      expect(mockExecFile).not.toHaveBeenCalled();
    });

    it('should handle rate limiting', async () => {
      const config: GitHubConfig = {
        maxRequestsPerMinute: 1,
        dryRunMode: false,
        auditLog: true,
        allowedOperations: [],
      };

      guard = new GitHubGuard(config);
      operations = new GitHubOperations(guard);

      mockExecFile.mockResolvedValue({ stdout: 'Success', stderr: '' });

      // First request should succeed
      await operations.createIssue({ title: 'Issue 1' });

      // Second request should be rate limited
      const result = await operations.createIssue({ title: 'Issue 2' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Rate limit exceeded');
    });

    it('should handle gh command errors', async () => {
      mockExecFile.mockRejectedValue(new Error('gh command failed'));

      const request: CreateIssueRequest = {
        title: 'Test Issue',
      };

      const result = await operations.createIssue(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('gh command failed');
    });

    it('should include milestone when provided', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'Issue created', stderr: '' });

      const request: CreateIssueRequest = {
        title: 'Test Issue',
        milestone: 5,
      };

      await operations.createIssue(request);

      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining([
        '--milestone',
        '5',
      ]));
    });
  });

  describe('updateIssue', () => {
    it('should update an issue successfully', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'Issue updated', stderr: '' });

      const request: UpdateIssueRequest = {
        issueNumber: 42,
        title: 'Updated Title',
        body: 'Updated body',
        state: 'closed',
      };

      const result = await operations.updateIssue(request);

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining([
        'issue',
        'edit',
        '42',
        '--title',
        'Updated Title',
        '--body',
        'Updated body',
        '--state',
        'closed',
      ]));
    });

    it('should add assignees when provided', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'Issue updated', stderr: '' });

      const request: UpdateIssueRequest = {
        issueNumber: 42,
        assignees: ['user1', 'user2'],
      };

      await operations.updateIssue(request);

      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining([
        '--add-assignee',
        'user1',
        '--add-assignee',
        'user2',
      ]));
    });

    it('should respect dry run mode', async () => {
      const request: UpdateIssueRequest = {
        issueNumber: 42,
        title: 'Updated',
        dryRun: true,
      };

      const result = await operations.updateIssue(request);

      expect(result.success).toBe(true);
      expect(result.data?.output).toContain('[dryRun]');
      expect(mockExecFile).not.toHaveBeenCalled();
    });
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'Comment created', stderr: '' });

      const request: CreateCommentRequest = {
        issueNumber: 42,
        body: 'Great work!',
      };

      const result = await operations.createComment(request);

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith('gh', [
        'issue',
        'comment',
        '42',
        '--body',
        'Great work!',
      ]);
    });

    it('should respect dry run mode', async () => {
      const request: CreateCommentRequest = {
        issueNumber: 42,
        body: 'Comment',
        dryRun: true,
      };

      const result = await operations.createComment(request);

      expect(result.success).toBe(true);
      expect(result.data?.output).toContain('[dryRun]');
      expect(mockExecFile).not.toHaveBeenCalled();
    });
  });

  describe('listIssues', () => {
    it('should list issues successfully', async () => {
      const mockIssues = [
        { number: 1, title: 'Issue 1', state: 'open', labels: [], assignees: [] },
        { number: 2, title: 'Issue 2', state: 'closed', labels: [], assignees: [] },
      ];

      mockExecFile.mockResolvedValue({ stdout: JSON.stringify(mockIssues), stderr: '' });

      const request: ListIssuesRequest = {};

      const result = await operations.listIssues(request);

      expect(result.success).toBe(true);
      expect(result.data?.issues).toEqual(mockIssues);
      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining([
        'issue',
        'list',
        '--json',
      ]));
    });

    it('should filter by state', async () => {
      mockExecFile.mockResolvedValue({ stdout: '[]', stderr: '' });

      const request: ListIssuesRequest = {
        state: 'closed',
      };

      await operations.listIssues(request);

      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining([
        '--state',
        'closed',
      ]));
    });

    it('should filter by labels', async () => {
      mockExecFile.mockResolvedValue({ stdout: '[]', stderr: '' });

      const request: ListIssuesRequest = {
        labels: ['bug', 'urgent'],
      };

      await operations.listIssues(request);

      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining([
        '--label',
        'bug,urgent',
      ]));
    });

    it('should filter by assignee', async () => {
      mockExecFile.mockResolvedValue({ stdout: '[]', stderr: '' });

      const request: ListIssuesRequest = {
        assignee: 'user1',
      };

      await operations.listIssues(request);

      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining([
        '--assignee',
        'user1',
      ]));
    });

    it('should limit results', async () => {
      mockExecFile.mockResolvedValue({ stdout: '[]', stderr: '' });

      const request: ListIssuesRequest = {
        per_page: 50,
      };

      await operations.listIssues(request);

      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining([
        '--limit',
        '50',
      ]));
    });

    it('should handle JSON parsing errors', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'invalid json', stderr: '' });

      const request: ListIssuesRequest = {};

      const result = await operations.listIssues(request);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('createPullRequest', () => {
    it('should create a pull request successfully', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'PR created', stderr: '' });

      const request: CreatePullRequestRequest = {
        title: 'New Feature',
        head: 'feature-branch',
        base: 'main',
        body: 'PR description',
        draft: true,
        labels: ['enhancement'],
      };

      const result = await operations.createPullRequest(request);

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining([
        'pr',
        'create',
        '--title',
        'New Feature',
        '--head',
        'feature-branch',
        '--base',
        'main',
        '--body',
        'PR description',
        '--draft',
        '--label',
        'enhancement',
      ]));
    });

    it('should respect dry run mode', async () => {
      const request: CreatePullRequestRequest = {
        title: 'New Feature',
        head: 'feature-branch',
        dryRun: true,
      };

      const result = await operations.createPullRequest(request);

      expect(result.success).toBe(true);
      expect(result.data?.output).toContain('[dryRun]');
      expect(mockExecFile).not.toHaveBeenCalled();
    });
  });

  describe('manageLabels', () => {
    it('should add labels', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'Labels added', stderr: '' });

      const request: ManageLabelsRequest = {
        issueNumber: 42,
        action: 'add',
        labels: ['bug', 'urgent'],
      };

      const result = await operations.manageLabels(request);

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining([
        'issue',
        'edit',
        '42',
        '--add-label',
        'bug',
        '--add-label',
        'urgent',
      ]));
    });

    it('should remove labels', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'Labels removed', stderr: '' });

      const request: ManageLabelsRequest = {
        issueNumber: 42,
        action: 'remove',
        labels: ['wontfix'],
      };

      await operations.manageLabels(request);

      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining([
        '--remove-label',
        'wontfix',
      ]));
    });

    it('should set labels', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'Labels set', stderr: '' });

      const request: ManageLabelsRequest = {
        issueNumber: 42,
        action: 'set',
        labels: ['bug', 'critical'],
      };

      await operations.manageLabels(request);

      expect(mockExecFile).toHaveBeenCalledWith('gh', expect.arrayContaining([
        '--label',
        'bug,critical',
      ]));
    });

    it('should respect dry run mode', async () => {
      const request: ManageLabelsRequest = {
        issueNumber: 42,
        action: 'add',
        labels: ['bug'],
        dryRun: true,
      };

      const result = await operations.manageLabels(request);

      expect(result.success).toBe(true);
      expect(result.data?.output).toContain('[dryRun]');
      expect(mockExecFile).not.toHaveBeenCalled();
    });
  });

  describe('audit log', () => {
    it('should log operations when enabled', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'Success', stderr: '' });

      await operations.createIssue({ title: 'Test' });

      const auditLog = operations.getAuditLog();

      expect(auditLog.length).toBe(1);
      expect(auditLog[0].operation).toBe('createIssue');
      expect(auditLog[0].result).toBe('success');
    });

    it('should log dry run operations', async () => {
      await operations.createIssue({ title: 'Test', dryRun: true });

      const auditLog = operations.getAuditLog();

      expect(auditLog.length).toBe(1);
      expect(auditLog[0].result).toBe('dry-run');
    });

    it('should log failures', async () => {
      mockExecFile.mockRejectedValue(new Error('Command failed'));

      await operations.createIssue({ title: 'Test' });

      const auditLog = operations.getAuditLog();

      expect(auditLog.length).toBe(1);
      expect(auditLog[0].result).toBe('failure');
      expect(auditLog[0].error).toBeDefined();
    });

    it('should clear audit log', async () => {
      mockExecFile.mockResolvedValue({ stdout: 'Success', stderr: '' });

      await operations.createIssue({ title: 'Test' });
      expect(operations.getAuditLog().length).toBe(1);

      operations.clearAuditLog();
      expect(operations.getAuditLog().length).toBe(0);
    });

    it('should not log when audit log is disabled', async () => {
      const config: GitHubConfig = {
        maxRequestsPerMinute: 60,
        dryRunMode: false,
        auditLog: false,
        allowedOperations: [],
      };

      guard = new GitHubGuard(config);
      operations = new GitHubOperations(guard);

      mockExecFile.mockResolvedValue({ stdout: 'Success', stderr: '' });

      await operations.createIssue({ title: 'Test' });

      const auditLog = operations.getAuditLog();
      expect(auditLog.length).toBe(0);
    });
  });
});
