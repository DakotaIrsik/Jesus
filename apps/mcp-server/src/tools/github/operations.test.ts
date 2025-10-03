import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GitHubOperations } from './operations.js';
import { GitHubGuard } from './guards.js';
import type { GitHubConfig } from './types.js';
import * as child_process from 'node:child_process';

// Mock child_process.execFile
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

describe('GitHubOperations', () => {
  let operations: GitHubOperations;
  let guard: GitHubGuard;
  let mockExecFile: any;

  beforeEach(() => {
    const config: GitHubConfig = {
      dryRunMode: false,
      auditLog: true,
      maxRequestsPerMinute: 60,
      allowedOperations: [], // Allow all
    };
    guard = new GitHubGuard(config);
    operations = new GitHubOperations(guard);

    // Reset and setup mock
    mockExecFile = vi.mocked(child_process.execFile);
    mockExecFile.mockReset();
    operations.clearAuditLog();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createIssue', () => {
    it('should create an issue with minimal fields', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: 'https://github.com/owner/repo/issues/1', stderr: '' });
      });

      const result = await operations.createIssue({
        title: 'Test Issue',
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Issue created successfully');
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['issue', 'create', '--title', 'Test Issue'],
        expect.objectContaining({ timeout: 30000 }),
        expect.any(Function)
      );
    });

    it('should create an issue with all fields', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: 'https://github.com/owner/repo/issues/2', stderr: '' });
      });

      const result = await operations.createIssue({
        title: 'Test Issue',
        body: 'Issue body',
        labels: ['bug', 'urgent'],
        assignees: ['user1', 'user2'],
        milestone: 1,
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        [
          'issue',
          'create',
          '--title',
          'Test Issue',
          '--body',
          'Issue body',
          '--label',
          'bug,urgent',
          '--assignee',
          'user1,user2',
          '--milestone',
          '1',
        ],
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should handle dry-run mode', async () => {
      const result = await operations.createIssue({
        title: 'Test Issue',
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.dryRun).toBe(true);
      expect(mockExecFile).not.toHaveBeenCalled();
    });

    it('should handle permission denied', async () => {
      const restrictedConfig: GitHubConfig = {
        dryRunMode: false,
        auditLog: true,
        maxRequestsPerMinute: 60,
        allowedOperations: ['issue.list'], // No create permission
      };
      const restrictedGuard = new GitHubGuard(restrictedConfig);
      const restrictedOps = new GitHubOperations(restrictedGuard);

      const result = await restrictedOps.createIssue({
        title: 'Test Issue',
        dryRun: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not allowed');
      expect(mockExecFile).not.toHaveBeenCalled();
    });

    it('should handle gh CLI errors', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(new Error('gh: command not found'), { stdout: '', stderr: '' });
      });

      const result = await operations.createIssue({
        title: 'Test Issue',
        dryRun: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('gh: command not found');
    });

    it('should log audit trail', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: 'https://github.com/owner/repo/issues/1', stderr: '' });
      });

      await operations.createIssue({
        title: 'Test Issue',
        dryRun: false,
      });

      const auditLog = operations.getAuditLog();
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].operation).toBe('issue.create');
      expect(auditLog[0].result).toBe('success');
    });
  });

  describe('updateIssue', () => {
    it('should update issue with all fields', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: 'Updated issue #1', stderr: '' });
      });

      const result = await operations.updateIssue({
        issueNumber: 1,
        title: 'Updated Title',
        body: 'Updated body',
        state: 'closed',
        labels: ['fixed'],
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          'issue',
          'edit',
          '1',
          '--title',
          'Updated Title',
          '--body',
          'Updated body',
          '--state',
          'closed',
          '--label',
          'fixed',
        ]),
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should handle milestone removal', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: 'Updated issue #1', stderr: '' });
      });

      const result = await operations.updateIssue({
        issueNumber: 1,
        milestone: null,
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining(['issue', 'edit', '1', '--remove-milestone']),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('createComment', () => {
    it('should add comment to issue', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: 'Comment added', stderr: '' });
      });

      const result = await operations.createComment({
        issueNumber: 1,
        body: 'Test comment',
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['issue', 'comment', '1', '--body', 'Test comment'],
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('createPullRequest', () => {
    it('should create PR with minimal fields', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: 'https://github.com/owner/repo/pull/1', stderr: '' });
      });

      const result = await operations.createPullRequest({
        title: 'Test PR',
        head: 'feature-branch',
        base: 'main',
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['pr', 'create', '--title', 'Test PR', '--head', 'feature-branch', '--base', 'main'],
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should create draft PR with all options', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: 'https://github.com/owner/repo/pull/2', stderr: '' });
      });

      const result = await operations.createPullRequest({
        title: 'Draft PR',
        body: 'PR description',
        head: 'feature',
        base: 'develop',
        draft: true,
        labels: ['wip'],
        assignees: ['reviewer1'],
        milestone: 2,
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          'pr',
          'create',
          '--title',
          'Draft PR',
          '--body',
          'PR description',
          '--head',
          'feature',
          '--base',
          'develop',
          '--draft',
          '--label',
          'wip',
          '--assignee',
          'reviewer1',
          '--milestone',
          '2',
        ]),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('manageLabels', () => {
    it('should add labels', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: 'Labels added', stderr: '' });
      });

      const result = await operations.manageLabels({
        issueNumber: 1,
        labels: ['bug', 'urgent'],
        action: 'add',
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['issue', 'edit', '1', '--add-label', 'bug,urgent'],
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should remove labels', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: 'Labels removed', stderr: '' });
      });

      const result = await operations.manageLabels({
        issueNumber: 1,
        labels: ['wip'],
        action: 'remove',
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['issue', 'edit', '1', '--remove-label', 'wip'],
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should set labels (replace all)', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: 'Labels set', stderr: '' });
      });

      const result = await operations.manageLabels({
        issueNumber: 1,
        labels: ['done'],
        action: 'set',
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        ['issue', 'edit', '1', '--label', 'done'],
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('listIssues', () => {
    it('should list open issues', async () => {
      const mockIssues = [
        { number: 1, title: 'Issue 1', state: 'OPEN', labels: [], assignees: [] },
        { number: 2, title: 'Issue 2', state: 'OPEN', labels: [], assignees: [] },
      ];

      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: JSON.stringify(mockIssues), stderr: '' });
      });

      const result = await operations.listIssues({
        state: 'open',
        per_page: 30,
        page: 1,
        sort: 'created',
        direction: 'desc',
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('issues');
      expect((result.data as any).issues).toHaveLength(2);
    });

    it('should list issues with filters', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: '[]', stderr: '' });
      });

      const result = await operations.listIssues({
        state: 'all',
        labels: ['bug', 'urgent'],
        assignee: 'user1',
        milestone: 1,
        per_page: 50,
        page: 1,
        sort: 'updated',
        direction: 'asc',
      });

      expect(result.success).toBe(true);
      expect(mockExecFile).toHaveBeenCalledWith(
        'gh',
        expect.arrayContaining([
          'issue',
          'list',
          '--state',
          'all',
          '--label',
          'bug,urgent',
          '--assignee',
          'user1',
          '--milestone',
          '1',
          '--limit',
          '50',
        ]),
        expect.any(Object),
        expect.any(Function)
      );
    });
  });

  describe('rate limiting', () => {
    it('should enforce rate limits', async () => {
      const config: GitHubConfig = {
        dryRunMode: false,
        auditLog: true,
        maxRequestsPerMinute: 2,
        allowedOperations: [],
      };
      const limitedGuard = new GitHubGuard(config);
      const limitedOps = new GitHubOperations(limitedGuard);

      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: 'Success', stderr: '' });
      });

      // First two requests should succeed
      const result1 = await limitedOps.createIssue({ title: 'Test 1', dryRun: false });
      expect(result1.success).toBe(true);

      const result2 = await limitedOps.createIssue({ title: 'Test 2', dryRun: false });
      expect(result2.success).toBe(true);

      // Third request should fail due to rate limit
      const result3 = await limitedOps.createIssue({ title: 'Test 3', dryRun: false });
      expect(result3.success).toBe(false);
      expect(result3.error).toContain('Rate limit exceeded');
    });
  });

  describe('audit logging', () => {
    it('should maintain audit log of operations', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(null, { stdout: 'Success', stderr: '' });
      });

      await operations.createIssue({ title: 'Issue 1', dryRun: false });
      await operations.createComment({ issueNumber: 1, body: 'Comment', dryRun: false });

      const auditLog = operations.getAuditLog();
      expect(auditLog).toHaveLength(2);
      expect(auditLog[0].operation).toBe('issue.create');
      expect(auditLog[1].operation).toBe('issue.comment');
      expect(auditLog.every((entry) => entry.result === 'success')).toBe(true);
    });

    it('should log failures in audit trail', async () => {
      mockExecFile.mockImplementation((_cmd, _args, _opts, callback) => {
        callback(new Error('API Error'), { stdout: '', stderr: '' });
      });

      await operations.createIssue({ title: 'Test', dryRun: false });

      const auditLog = operations.getAuditLog();
      expect(auditLog).toHaveLength(1);
      expect(auditLog[0].result).toBe('failure');
      expect(auditLog[0].error).toBe('API Error');
    });

    it('should be clearable', () => {
      operations.clearAuditLog();
      expect(operations.getAuditLog()).toHaveLength(0);
    });
  });
});
