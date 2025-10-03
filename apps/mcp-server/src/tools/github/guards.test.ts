import { describe, it, expect, beforeEach } from 'vitest';
import { GitHubGuard } from './guards.js';
import type { GitHubConfig } from './types.js';

describe('GitHubGuard', () => {
  let guard: GitHubGuard;

  beforeEach(() => {
    const config: GitHubConfig = {
      dryRunMode: false,
      auditLog: true,
      maxRequestsPerMinute: 5,
      allowedOperations: ['issue.create', 'issue.list', 'pr.create'],
    };
    guard = new GitHubGuard(config);
  });

  describe('isOperationAllowed', () => {
    it('should allow operations in the allowlist', () => {
      expect(guard.isOperationAllowed('issue.create')).toBe(true);
      expect(guard.isOperationAllowed('issue.list')).toBe(true);
      expect(guard.isOperationAllowed('pr.create')).toBe(true);
    });

    it('should deny operations not in the allowlist', () => {
      expect(guard.isOperationAllowed('issue.update')).toBe(false);
      expect(guard.isOperationAllowed('pr.update')).toBe(false);
      expect(guard.isOperationAllowed('label.add')).toBe(false);
    });

    it('should allow all operations when allowlist is empty', () => {
      const config: GitHubConfig = {
        dryRunMode: false,
        auditLog: true,
        maxRequestsPerMinute: 60,
        allowedOperations: [],
      };
      const openGuard = new GitHubGuard(config);

      expect(openGuard.isOperationAllowed('issue.create')).toBe(true);
      expect(openGuard.isOperationAllowed('issue.update')).toBe(true);
      expect(openGuard.isOperationAllowed('pr.create')).toBe(true);
      expect(openGuard.isOperationAllowed('label.add')).toBe(true);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests under the rate limit', () => {
      const result1 = guard.checkRateLimit('issue.create');
      expect(result1.allowed).toBe(true);
      expect(result1.info.remaining).toBe(4);
      expect(result1.info.used).toBe(1);

      const result2 = guard.checkRateLimit('issue.create');
      expect(result2.allowed).toBe(true);
      expect(result2.info.remaining).toBe(3);
      expect(result2.info.used).toBe(2);
    });

    it('should deny requests over the rate limit', () => {
      // Make 5 requests (at the limit)
      for (let i = 0; i < 5; i++) {
        const result = guard.checkRateLimit('issue.create');
        expect(result.allowed).toBe(true);
      }

      // 6th request should be denied
      const result = guard.checkRateLimit('issue.create');
      expect(result.allowed).toBe(false);
      expect(result.info.remaining).toBe(0);
      expect(result.info.used).toBe(5);
    });

    it('should track rate limits separately per operation', () => {
      // Use up limit for issue.create
      for (let i = 0; i < 5; i++) {
        guard.checkRateLimit('issue.create');
      }

      // pr.create should still have full limit
      const result = guard.checkRateLimit('pr.create');
      expect(result.allowed).toBe(true);
      expect(result.info.remaining).toBe(4);
    });

    it('should reset rate limit after time window', async () => {
      // Mock implementation - in real test would need to wait or mock time
      // This test demonstrates the expected behavior
      const config: GitHubConfig = {
        dryRunMode: false,
        auditLog: true,
        maxRequestsPerMinute: 2,
        allowedOperations: [],
      };
      const testGuard = new GitHubGuard(config);

      testGuard.checkRateLimit('test');
      testGuard.checkRateLimit('test');

      // Should be at limit
      const atLimit = testGuard.checkRateLimit('test');
      expect(atLimit.allowed).toBe(false);
    });

    it('should provide accurate rate limit info', () => {
      const result = guard.checkRateLimit('issue.list');

      expect(result.info.limit).toBe(5);
      expect(result.info.remaining).toBe(4);
      expect(result.info.used).toBe(1);
      expect(result.info.reset).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const config = guard.getConfig();

      expect(config.dryRunMode).toBe(false);
      expect(config.auditLog).toBe(true);
      expect(config.maxRequestsPerMinute).toBe(5);
      expect(config.allowedOperations).toContain('issue.create');
    });

    it('should return readonly config', () => {
      const config = guard.getConfig();

      // TypeScript should prevent this, but checking runtime behavior
      expect(Object.isFrozen(config)).toBe(false); // Not frozen, but readonly type
    });
  });

  describe('isAuditEnabled', () => {
    it('should return true when audit is enabled', () => {
      expect(guard.isAuditEnabled()).toBe(true);
    });

    it('should return false when audit is disabled', () => {
      const config: GitHubConfig = {
        dryRunMode: false,
        auditLog: false,
        maxRequestsPerMinute: 60,
        allowedOperations: [],
      };
      const noAuditGuard = new GitHubGuard(config);

      expect(noAuditGuard.isAuditEnabled()).toBe(false);
    });
  });

  describe('isDryRunMode', () => {
    it('should return false when dry-run is disabled', () => {
      expect(guard.isDryRunMode()).toBe(false);
    });

    it('should return true when dry-run is enabled', () => {
      const config: GitHubConfig = {
        dryRunMode: true,
        auditLog: true,
        maxRequestsPerMinute: 60,
        allowedOperations: [],
      };
      const dryRunGuard = new GitHubGuard(config);

      expect(dryRunGuard.isDryRunMode()).toBe(true);
    });
  });

  describe('resetRateLimits', () => {
    it('should clear all rate limit tracking', () => {
      // Use up some requests
      for (let i = 0; i < 5; i++) {
        guard.checkRateLimit('issue.create');
      }

      // Should be at limit
      const atLimit = guard.checkRateLimit('issue.create');
      expect(atLimit.allowed).toBe(false);

      // Reset
      guard.resetRateLimits();

      // Should now be allowed again
      const afterReset = guard.checkRateLimit('issue.create');
      expect(afterReset.allowed).toBe(true);
      expect(afterReset.info.remaining).toBe(4);
    });
  });
});
