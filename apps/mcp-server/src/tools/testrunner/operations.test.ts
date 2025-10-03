import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestRunnerOperations } from './operations.js';
import { TestRunnerGuard } from './guards.js';

describe('TestRunnerOperations', () => {
  const config = {
    defaultTimeout: 300000,
    enableCoverage: true,
    maxRetries: 2,
    allowedFrameworks: ['jest', 'vitest', 'pytest', 'xunit'] as const,
  };

  let guard: TestRunnerGuard;
  let operations: TestRunnerOperations;

  beforeEach(() => {
    guard = new TestRunnerGuard(config);
    operations = new TestRunnerOperations(guard);
  });

  describe('runTests', () => {
    it('should reject disallowed framework', async () => {
      const result = await operations.runTests({
        framework: 'mocha' as any,
        args: [],
        coverage: true,
        retry: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not allowed');
    });

    it('should reject dangerous arguments', async () => {
      const result = await operations.runTests({
        framework: 'jest',
        args: ['--file=$(whoami)'],
        coverage: true,
        retry: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Dangerous argument');
    });

    it('should reject invalid working directory', async () => {
      const result = await operations.runTests({
        framework: 'jest',
        args: [],
        coverage: true,
        retry: false,
        cwd: '../../../etc',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Path traversal');
    });

    it('should build correct Jest command', async () => {
      // Note: This test will attempt to run npx jest, which may not be available
      // In a real test environment, we'd mock the spawn function
      const request = {
        framework: 'jest' as const,
        testPath: 'src/**/*.test.ts',
        args: ['--verbose'],
        coverage: true,
        retry: false,
      };

      // We can't easily test the actual execution without mocking child_process
      // but we can verify the request passes validation
      expect(guard.isFrameworkAllowed(request.framework)).toBe(true);
      expect(guard.validateTestArgs(request.args).valid).toBe(true);
    });
  });

  describe('getCoverage', () => {
    it('should return error when no coverage data exists', async () => {
      const result = await operations.getCoverage({
        format: 'json',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('No coverage data found');
    });

    it('should accept all supported formats', async () => {
      const formats = ['json', 'lcov', 'html', 'text'] as const;

      for (const format of formats) {
        const result = await operations.getCoverage({ format });
        // Will fail due to no coverage, but validates format is accepted
        expect(result.error).toContain('No coverage data found');
      }
    });
  });

  describe('buildTestCommand', () => {
    it('should build Jest command with coverage', () => {
      const cmd = (operations as any).buildTestCommand({
        framework: 'jest',
        testPath: 'src/**/*.test.ts',
        args: ['--verbose'],
        coverage: true,
        retry: false,
      });

      expect(cmd.cmd).toBe('npx');
      expect(cmd.args).toContain('jest');
      expect(cmd.args).toContain('--coverage');
      expect(cmd.args).toContain('--verbose');
      expect(cmd.args).toContain('src/**/*.test.ts');
    });

    it('should build Vitest command with coverage', () => {
      const cmd = (operations as any).buildTestCommand({
        framework: 'vitest',
        testPath: 'src/**/*.test.ts',
        args: [],
        coverage: true,
        retry: false,
      });

      expect(cmd.cmd).toBe('npx');
      expect(cmd.args).toContain('vitest');
      expect(cmd.args).toContain('run');
      expect(cmd.args).toContain('--coverage');
    });

    it('should build Pytest command with coverage', () => {
      const cmd = (operations as any).buildTestCommand({
        framework: 'pytest',
        args: [],
        coverage: true,
        retry: false,
      });

      expect(cmd.cmd).toBe('python');
      expect(cmd.args).toContain('-m');
      expect(cmd.args).toContain('pytest');
      expect(cmd.args).toContain('--cov');
    });

    it('should build xUnit command', () => {
      const cmd = (operations as any).buildTestCommand({
        framework: 'xunit',
        args: [],
        coverage: true,
        retry: false,
      });

      expect(cmd.cmd).toBe('dotnet');
      expect(cmd.args).toContain('test');
    });
  });

  describe('parseTestOutput', () => {
    it('should parse Jest output correctly', () => {
      const output = `
        Tests: 8 total
        5 passed
        2 failed
        1 skipped
        Snapshots: 0 total
        Time: 3.456 s
      `;

      const result = (operations as any).parseTestOutput(output, 'jest');

      expect(result.totalTests).toBe(8);
      expect(result.passedTests).toBe(5);
      expect(result.failedTests).toBe(2);
      expect(result.skippedTests).toBe(1);
    });

    it('should parse Pytest output correctly', () => {
      const output = `
        ======================== 10 passed, 2 failed, 1 skipped in 2.34s ========================
      `;

      const result = (operations as any).parseTestOutput(output, 'pytest');

      expect(result.totalTests).toBe(13);
      expect(result.passedTests).toBe(10);
      expect(result.failedTests).toBe(2);
      expect(result.skippedTests).toBe(1);
    });
  });

  describe('parseCoverageJson', () => {
    it('should parse coverage JSON correctly', () => {
      const data = {
        total: {
          lines: { total: 100, covered: 80, pct: 80 },
          statements: { total: 150, covered: 120, pct: 80 },
          functions: { total: 20, covered: 18, pct: 90 },
          branches: { total: 40, covered: 32, pct: 80 },
        },
      };

      const result = (operations as any).parseCoverageJson(data);

      expect(result.lines.total).toBe(100);
      expect(result.lines.covered).toBe(80);
      expect(result.lines.percentage).toBe(80);
      expect(result.functions.percentage).toBe(90);
    });
  });

  describe('parseLcov', () => {
    it('should parse LCOV data correctly', () => {
      const lcov = `SF:file1.ts
FNF:10
FNH:8
LF:100
LH:85
BRF:20
BRH:16
end_of_record`;

      const result = (operations as any).parseLcov(lcov);

      expect(result.lines.total).toBe(100);
      expect(result.lines.covered).toBe(85);
      expect(result.functions.total).toBe(10);
      expect(result.functions.covered).toBe(8);
      expect(result.branches.total).toBe(20);
      expect(result.branches.covered).toBe(16);
    });
  });
});
