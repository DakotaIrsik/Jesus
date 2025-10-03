import type { TestRunnerConfig } from './types.js';

/**
 * Security guards for test runner operations
 */
export class TestRunnerGuard {
  constructor(private readonly config: TestRunnerConfig) {}

  /**
   * Check if framework is allowed
   */
  isFrameworkAllowed(framework: string): boolean {
    return this.config.allowedFrameworks.includes(framework as any);
  }

  /**
   * Validate test arguments for security
   */
  validateTestArgs(args: string[]): { valid: boolean; error?: string } {
    // Check for dangerous arguments
    const dangerousPatterns = [
      /--allow-net/i,
      /--allow-run/i,
      /--allow-write/i,
      /--allow-read/i,
      /--allow-env/i,
      /--allow-all/i,
      /--eval/i,
      /--exec/i,
      /&&/,
      /;/,
      /\|/,
      /`/,
      /\$\(/,
    ];

    for (const arg of args) {
      for (const pattern of dangerousPatterns) {
        if (pattern.test(arg)) {
          return {
            valid: false,
            error: `Dangerous argument detected: ${arg}`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Validate working directory path
   */
  validateWorkingDirectory(cwd: string): { valid: boolean; error?: string } {
    // Prevent path traversal
    if (cwd.includes('..')) {
      return {
        valid: false,
        error: 'Path traversal detected in working directory',
      };
    }

    // Check for absolute paths outside project
    const normalizedCwd = cwd.replace(/\\/g, '/');
    const projectRoot = process.cwd().replace(/\\/g, '/');

    if (!normalizedCwd.startsWith(projectRoot) && !normalizedCwd.startsWith('.')) {
      return {
        valid: false,
        error: 'Working directory must be within project root',
      };
    }

    return { valid: true };
  }

  /**
   * Get timeout with bounds checking
   */
  getSafeTimeout(requestedTimeout?: number): number {
    const timeout = requestedTimeout ?? this.config.defaultTimeout;
    const MIN_TIMEOUT = 1000; // 1 second
    const MAX_TIMEOUT = 600000; // 10 minutes

    if (timeout < MIN_TIMEOUT) {
      return MIN_TIMEOUT;
    }
    if (timeout > MAX_TIMEOUT) {
      return MAX_TIMEOUT;
    }
    return timeout;
  }

  /**
   * Get retry count with bounds checking
   */
  getSafeRetryCount(retry: boolean): number {
    if (!retry) {
      return 0;
    }
    return Math.min(this.config.maxRetries, 5); // Max 5 retries
  }
}
