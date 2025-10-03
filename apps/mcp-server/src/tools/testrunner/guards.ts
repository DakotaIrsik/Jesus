import * as path from 'node:path';
import type { TestRunnerConfig } from './types.js';

export class TestRunnerGuard {
  constructor(private config: TestRunnerConfig) {}

  validateTestArgs(args: string[]): { valid: boolean; error?: string } {
    // Check for dangerous shell metacharacters and command injection
    const dangerousPatterns = [
      /[;&|`$(){}]/,  // Shell metacharacters
      /--exec/i,
      /--eval/i,
      /--allow-run/i,
      /--allow-all/i,
      /--allow-net/i,
      /--allow-write/i,
    ];

    for (const arg of args) {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(arg)) {
          return { valid: false, error: `Dangerous argument detected: ${arg}` };
        }
      }
    }

    return { valid: true };
  }

  validateWorkingDirectory(cwd: string): { valid: boolean; error?: string } {
    try {
      const projectRoot = process.cwd();
      const normalizedCwd = path.normalize(cwd);
      const resolvedCwd = path.resolve(normalizedCwd);

      // Check for path traversal
      if (normalizedCwd.includes('..')) {
        return { valid: false, error: 'Path traversal detected' };
      }

      // Ensure path is within project root
      if (!resolvedCwd.startsWith(projectRoot)) {
        return { valid: false, error: 'Working directory must be within project root' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: `Invalid working directory: ${error}` };
    }
  }

  isFrameworkAllowed(framework: string): boolean {
    return this.config.allowedFrameworks.includes(framework);
  }

  getSafeTimeout(timeout: number | undefined): number {
    const MIN_TIMEOUT = 1000; // 1 second
    const MAX_TIMEOUT = 600000; // 10 minutes

    if (timeout === undefined || timeout === null) {
      return this.config.defaultTimeout;
    }

    if (timeout <= 0) {
      return MIN_TIMEOUT;
    }

    if (timeout > MAX_TIMEOUT) {
      return MAX_TIMEOUT;
    }

    return timeout;
  }

  getSafeRetryCount(retry: boolean): number {
    const MAX_RETRIES = 5;

    if (!retry) {
      return 0;
    }

    return Math.min(this.config.maxRetries, MAX_RETRIES);
  }
}
