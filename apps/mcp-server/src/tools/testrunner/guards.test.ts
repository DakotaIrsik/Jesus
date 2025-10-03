import { describe, it, expect } from 'vitest';
import { TestRunnerGuard } from './guards.js';

describe('TestRunnerGuard', () => {
  const config = {
    defaultTimeout: 300000,
    enableCoverage: true,
    maxRetries: 2,
    allowedFrameworks: ['jest', 'vitest', 'pytest'] as const,
  };

  const guard = new TestRunnerGuard(config);

  describe('isFrameworkAllowed', () => {
    it('should allow configured frameworks', () => {
      expect(guard.isFrameworkAllowed('jest')).toBe(true);
      expect(guard.isFrameworkAllowed('vitest')).toBe(true);
      expect(guard.isFrameworkAllowed('pytest')).toBe(true);
    });

    it('should deny non-configured frameworks', () => {
      expect(guard.isFrameworkAllowed('mocha')).toBe(false);
      expect(guard.isFrameworkAllowed('ava')).toBe(false);
    });
  });

  describe('validateTestArgs', () => {
    it('should allow safe arguments', () => {
      const result = guard.validateTestArgs(['--watch', '--verbose', '--bail']);
      expect(result.valid).toBe(true);
    });

    it('should deny dangerous arguments with shell metacharacters', () => {
      expect(guard.validateTestArgs(['arg1 && rm -rf /']).valid).toBe(false);
      expect(guard.validateTestArgs(['arg1; echo bad']).valid).toBe(false);
      expect(guard.validateTestArgs(['arg1 | grep bad']).valid).toBe(false);
    });

    it('should deny arguments with command substitution', () => {
      expect(guard.validateTestArgs(['--file=$(whoami)']).valid).toBe(false);
      expect(guard.validateTestArgs(['--file=`whoami`']).valid).toBe(false);
    });

    it('should deny dangerous permission flags', () => {
      expect(guard.validateTestArgs(['--allow-all']).valid).toBe(false);
      expect(guard.validateTestArgs(['--allow-run']).valid).toBe(false);
      expect(guard.validateTestArgs(['--eval', 'console.log(1)']).valid).toBe(false);
    });
  });

  describe('validateWorkingDirectory', () => {
    it('should allow relative paths within project', () => {
      const result = guard.validateWorkingDirectory('./apps/mcp-server');
      expect(result.valid).toBe(true);
    });

    it('should deny path traversal', () => {
      const result = guard.validateWorkingDirectory('../../../etc');
      expect(result.valid).toBe(false);
    });

    it('should deny absolute paths outside project', () => {
      const result = guard.validateWorkingDirectory('/etc/passwd');
      expect(result.valid).toBe(false);
    });
  });

  describe('getSafeTimeout', () => {
    it('should return default timeout when none specified', () => {
      expect(guard.getSafeTimeout()).toBe(300000);
    });

    it('should return requested timeout within bounds', () => {
      expect(guard.getSafeTimeout(60000)).toBe(60000);
    });

    it('should enforce minimum timeout', () => {
      expect(guard.getSafeTimeout(500)).toBe(1000);
    });

    it('should enforce maximum timeout', () => {
      expect(guard.getSafeTimeout(999999999)).toBe(600000);
    });
  });

  describe('getSafeRetryCount', () => {
    it('should return 0 when retry is false', () => {
      expect(guard.getSafeRetryCount(false)).toBe(0);
    });

    it('should return configured retry count when retry is true', () => {
      expect(guard.getSafeRetryCount(true)).toBe(2);
    });

    it('should enforce maximum retry count', () => {
      const highRetryGuard = new TestRunnerGuard({
        ...config,
        maxRetries: 10,
      });
      expect(highRetryGuard.getSafeRetryCount(true)).toBe(5);
    });
  });
});
