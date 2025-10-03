import { describe, it, expect, beforeEach } from 'vitest';
import { TestRunnerGuard } from './guards.js';
import type { TestRunnerConfig } from './types.js';
import * as path from 'node:path';

describe('TestRunnerGuard', () => {
  let guard: TestRunnerGuard;

  beforeEach(() => {
    const config: TestRunnerConfig = {
      allowedFrameworks: ['jest', 'vitest', 'pytest', 'mocha'],
      defaultTimeout: 60000,
      maxRetries: 3,
    };

    guard = new TestRunnerGuard(config);
  });

  describe('validateTestArgs', () => {
    it('should accept safe arguments', () => {
      const args = ['--verbose', '--coverage', '--reporter=json'];

      const result = guard.validateTestArgs(args);

      expect(result.valid).toBe(true);
    });

    it('should reject arguments with shell metacharacters', () => {
      const dangerousArgs = [
        ['test; rm -rf /'],
        ['test && malicious'],
        ['test | cat /etc/passwd'],
        ['test `whoami`'],
        ['test $(whoami)'],
        ['test & background'],
        ['test{evil}'],
      ];

      for (const args of dangerousArgs) {
        const result = guard.validateTestArgs(args);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Dangerous argument detected');
      }
    });

    it('should reject --exec flag', () => {
      const args = ['--exec', 'malicious-command'];

      const result = guard.validateTestArgs(args);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Dangerous argument detected');
    });

    it('should reject --eval flag', () => {
      const args = ['--eval', 'malicious code'];

      const result = guard.validateTestArgs(args);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Dangerous argument detected');
    });

    it('should reject --allow-run flag (Deno)', () => {
      const args = ['--allow-run'];

      const result = guard.validateTestArgs(args);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Dangerous argument detected');
    });

    it('should reject --allow-all flag (Deno)', () => {
      const args = ['--allow-all'];

      const result = guard.validateTestArgs(args);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Dangerous argument detected');
    });

    it('should reject --allow-net flag (Deno)', () => {
      const args = ['--allow-net'];

      const result = guard.validateTestArgs(args);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Dangerous argument detected');
    });

    it('should reject --allow-write flag (Deno)', () => {
      const args = ['--allow-write'];

      const result = guard.validateTestArgs(args);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Dangerous argument detected');
    });

    it('should be case-insensitive for dangerous flags', () => {
      const args = ['--EXEC', 'command'];

      const result = guard.validateTestArgs(args);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Dangerous argument detected');
    });

    it('should accept empty args array', () => {
      const args: string[] = [];

      const result = guard.validateTestArgs(args);

      expect(result.valid).toBe(true);
    });

    it('should handle multiple valid arguments', () => {
      const args = [
        '--verbose',
        '--reporter',
        'json',
        '--coverage',
        '--maxWorkers=4',
        '--testPathPattern=unit',
      ];

      const result = guard.validateTestArgs(args);

      expect(result.valid).toBe(true);
    });

    it('should detect danger in any position of args array', () => {
      const args = ['--verbose', '--coverage', '--exec', 'malicious'];

      const result = guard.validateTestArgs(args);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('--exec');
    });
  });

  describe('validateWorkingDirectory', () => {
    it('should accept path within project root', () => {
      const projectRoot = process.cwd();
      const cwd = path.join(projectRoot, 'tests');

      const result = guard.validateWorkingDirectory(cwd);

      expect(result.valid).toBe(true);
    });

    it('should accept current directory', () => {
      const cwd = process.cwd();

      const result = guard.validateWorkingDirectory(cwd);

      expect(result.valid).toBe(true);
    });

    it('should reject path traversal attempts', () => {
      const cwd = '../../../etc';

      const result = guard.validateWorkingDirectory(cwd);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Path traversal detected');
    });

    it('should reject path outside project root', () => {
      const cwd = '/tmp/outside-project';

      const result = guard.validateWorkingDirectory(cwd);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be within project root');
    });

    it('should normalize paths before validation', () => {
      const projectRoot = process.cwd();
      const cwd = path.join(projectRoot, 'tests', '..', 'src');

      // This contains .. but resolves to a valid path within project
      const result = guard.validateWorkingDirectory(cwd);

      expect(result.valid).toBe(false); // Should still reject due to '..' in path
      expect(result.error).toContain('Path traversal detected');
    });

    it('should handle relative paths', () => {
      const cwd = 'tests/unit';

      const result = guard.validateWorkingDirectory(cwd);

      expect(result.valid).toBe(true);
    });

    it('should handle nested directories', () => {
      const projectRoot = process.cwd();
      const cwd = path.join(projectRoot, 'packages', 'core', 'tests');

      const result = guard.validateWorkingDirectory(cwd);

      expect(result.valid).toBe(true);
    });
  });

  describe('isFrameworkAllowed', () => {
    it('should allow configured frameworks', () => {
      expect(guard.isFrameworkAllowed('jest')).toBe(true);
      expect(guard.isFrameworkAllowed('vitest')).toBe(true);
      expect(guard.isFrameworkAllowed('pytest')).toBe(true);
      expect(guard.isFrameworkAllowed('mocha')).toBe(true);
    });

    it('should reject unconfigured frameworks', () => {
      expect(guard.isFrameworkAllowed('ava')).toBe(false);
      expect(guard.isFrameworkAllowed('xunit')).toBe(false);
      expect(guard.isFrameworkAllowed('unknown')).toBe(false);
    });

    it('should be case-sensitive', () => {
      expect(guard.isFrameworkAllowed('jest')).toBe(true);
      expect(guard.isFrameworkAllowed('Jest')).toBe(false);
      expect(guard.isFrameworkAllowed('JEST')).toBe(false);
    });

    it('should handle empty framework list', () => {
      const config: TestRunnerConfig = {
        allowedFrameworks: [],
        defaultTimeout: 60000,
        maxRetries: 3,
      };

      guard = new TestRunnerGuard(config);

      expect(guard.isFrameworkAllowed('jest')).toBe(false);
      expect(guard.isFrameworkAllowed('any')).toBe(false);
    });

    it('should handle single framework', () => {
      const config: TestRunnerConfig = {
        allowedFrameworks: ['jest'],
        defaultTimeout: 60000,
        maxRetries: 3,
      };

      guard = new TestRunnerGuard(config);

      expect(guard.isFrameworkAllowed('jest')).toBe(true);
      expect(guard.isFrameworkAllowed('vitest')).toBe(false);
    });
  });

  describe('getSafeTimeout', () => {
    it('should return default timeout when undefined', () => {
      const timeout = guard.getSafeTimeout(undefined);

      expect(timeout).toBe(60000);
    });

    it('should return default timeout when null', () => {
      const timeout = guard.getSafeTimeout(null as any);

      expect(timeout).toBe(60000);
    });

    it('should accept valid timeout values', () => {
      expect(guard.getSafeTimeout(30000)).toBe(30000);
      expect(guard.getSafeTimeout(120000)).toBe(120000);
    });

    it('should enforce minimum timeout of 1 second', () => {
      expect(guard.getSafeTimeout(0)).toBe(1000);
      expect(guard.getSafeTimeout(-1000)).toBe(1000);
      expect(guard.getSafeTimeout(500)).toBe(1000);
    });

    it('should enforce maximum timeout of 10 minutes', () => {
      const maxTimeout = 600000; // 10 minutes

      expect(guard.getSafeTimeout(700000)).toBe(maxTimeout);
      expect(guard.getSafeTimeout(1000000)).toBe(maxTimeout);
      expect(guard.getSafeTimeout(Number.MAX_SAFE_INTEGER)).toBe(maxTimeout);
    });

    it('should accept timeout at minimum boundary', () => {
      expect(guard.getSafeTimeout(1000)).toBe(1000);
    });

    it('should accept timeout at maximum boundary', () => {
      expect(guard.getSafeTimeout(600000)).toBe(600000);
    });

    it('should handle very small positive values', () => {
      expect(guard.getSafeTimeout(1)).toBe(1000);
      expect(guard.getSafeTimeout(100)).toBe(1000);
    });

    it('should handle negative values', () => {
      expect(guard.getSafeTimeout(-5000)).toBe(1000);
      expect(guard.getSafeTimeout(-1)).toBe(1000);
    });
  });

  describe('getSafeRetryCount', () => {
    it('should return 0 when retry is false', () => {
      const retries = guard.getSafeRetryCount(false);

      expect(retries).toBe(0);
    });

    it('should return configured max retries when retry is true', () => {
      const retries = guard.getSafeRetryCount(true);

      expect(retries).toBe(3); // maxRetries from config
    });

    it('should enforce maximum of 5 retries', () => {
      const config: TestRunnerConfig = {
        allowedFrameworks: ['jest'],
        defaultTimeout: 60000,
        maxRetries: 10,
      };

      guard = new TestRunnerGuard(config);

      const retries = guard.getSafeRetryCount(true);

      expect(retries).toBe(5); // Capped at 5
    });

    it('should handle zero maxRetries in config', () => {
      const config: TestRunnerConfig = {
        allowedFrameworks: ['jest'],
        defaultTimeout: 60000,
        maxRetries: 0,
      };

      guard = new TestRunnerGuard(config);

      const retries = guard.getSafeRetryCount(true);

      expect(retries).toBe(0);
    });

    it('should handle negative maxRetries in config', () => {
      const config: TestRunnerConfig = {
        allowedFrameworks: ['jest'],
        defaultTimeout: 60000,
        maxRetries: -1,
      };

      guard = new TestRunnerGuard(config);

      const retries = guard.getSafeRetryCount(true);

      expect(retries).toBe(-1); // Returns min of config and 5
    });

    it('should return exact value when within bounds', () => {
      const config: TestRunnerConfig = {
        allowedFrameworks: ['jest'],
        defaultTimeout: 60000,
        maxRetries: 2,
      };

      guard = new TestRunnerGuard(config);

      const retries = guard.getSafeRetryCount(true);

      expect(retries).toBe(2);
    });
  });

  describe('configuration edge cases', () => {
    it('should handle empty config gracefully', () => {
      const config: TestRunnerConfig = {
        allowedFrameworks: [],
        defaultTimeout: 0,
        maxRetries: 0,
      };

      guard = new TestRunnerGuard(config);

      expect(guard.isFrameworkAllowed('jest')).toBe(false);
      expect(guard.getSafeTimeout(undefined)).toBe(0);
      expect(guard.getSafeRetryCount(true)).toBe(0);
    });

    it('should handle very large default timeout', () => {
      const config: TestRunnerConfig = {
        allowedFrameworks: ['jest'],
        defaultTimeout: 1000000,
        maxRetries: 3,
      };

      guard = new TestRunnerGuard(config);

      const timeout = guard.getSafeTimeout(undefined);

      expect(timeout).toBe(1000000); // Returns default even if very large
    });

    it('should handle all standard frameworks', () => {
      const config: TestRunnerConfig = {
        allowedFrameworks: ['jest', 'vitest', 'pytest', 'mocha', 'ava', 'xunit'],
        defaultTimeout: 60000,
        maxRetries: 3,
      };

      guard = new TestRunnerGuard(config);

      expect(guard.isFrameworkAllowed('jest')).toBe(true);
      expect(guard.isFrameworkAllowed('vitest')).toBe(true);
      expect(guard.isFrameworkAllowed('pytest')).toBe(true);
      expect(guard.isFrameworkAllowed('mocha')).toBe(true);
      expect(guard.isFrameworkAllowed('ava')).toBe(true);
      expect(guard.isFrameworkAllowed('xunit')).toBe(true);
    });
  });

  describe('security edge cases', () => {
    it('should reject multiple dangerous patterns in one arg', () => {
      const args = ['test; echo `whoami` && rm -rf /'];

      const result = guard.validateTestArgs(args);

      expect(result.valid).toBe(false);
    });

    it('should reject URL-like working directories outside project', () => {
      const cwd = 'file:///etc/passwd';

      const result = guard.validateWorkingDirectory(cwd);

      expect(result.valid).toBe(false);
    });

    it('should handle backslash path separators (Windows)', () => {
      const projectRoot = process.cwd();
      const cwd = path.join(projectRoot, 'tests').replace(/\//g, '\\');

      const result = guard.validateWorkingDirectory(cwd);

      expect(result.valid).toBe(true);
    });

    it('should reject args with dollar signs (variable expansion)', () => {
      const args = ['$MALICIOUS_VAR'];

      const result = guard.validateTestArgs(args);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Dangerous argument detected');
    });
  });
});
