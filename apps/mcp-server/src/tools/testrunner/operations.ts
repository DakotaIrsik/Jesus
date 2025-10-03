import { spawn } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { TestRunnerGuard } from './guards.js';
import type {
  RunTestsRequest,
  GetCoverageRequest,
  TestOperationResult,
  TestResult,
  CoverageReport,
} from './types.js';

/**
 * Test runner operations with security checks
 */
export class TestRunnerOperations {
  constructor(private readonly guard: TestRunnerGuard) {}

  /**
   * Run tests with specified framework
   */
  async runTests(request: RunTestsRequest): Promise<TestOperationResult> {
    try {
      // Check if framework is allowed
      if (!this.guard.isFrameworkAllowed(request.framework)) {
        return {
          success: false,
          error: `Framework '${request.framework}' is not allowed`,
        };
      }

      // Validate test arguments
      const argsValidation = this.guard.validateTestArgs(request.args);
      if (!argsValidation.valid) {
        return {
          success: false,
          error: argsValidation.error,
        };
      }

      // Validate working directory
      const cwd = request.cwd ?? process.cwd();
      const cwdValidation = this.guard.validateWorkingDirectory(cwd);
      if (!cwdValidation.valid) {
        return {
          success: false,
          error: cwdValidation.error,
        };
      }

      // Get safe timeout
      const timeout = this.guard.getSafeTimeout(request.timeout);
      const retryCount = this.guard.getSafeRetryCount(request.retry);

      // Build command based on framework
      const command = this.buildTestCommand(request);
      if (!command) {
        return {
          success: false,
          error: `Unsupported test framework: ${request.framework}`,
        };
      }

      // Run tests with retry logic
      let lastError: string | undefined;
      for (let attempt = 0; attempt <= retryCount; attempt++) {
        const result = await this.executeTest(command, cwd, timeout);

        if (result.success || attempt === retryCount) {
          return result;
        }

        lastError = result.error;
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }

      return {
        success: false,
        error: lastError ?? 'Test execution failed after retries',
      };
    } catch (error) {
      return {
        success: false,
        error: `Test execution failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get coverage report
   */
  async getCoverage(request: GetCoverageRequest): Promise<TestOperationResult> {
    try {
      const coveragePath = path.join(process.cwd(), 'coverage');

      // Check if coverage directory exists
      try {
        await fs.access(coveragePath);
      } catch {
        return {
          success: false,
          error: 'No coverage data found. Run tests with coverage enabled first.',
        };
      }

      // Read coverage report based on format
      let coverageData: CoverageReport | undefined;

      switch (request.format) {
        case 'json': {
          const jsonPath = path.join(coveragePath, 'coverage-summary.json');
          try {
            const data = await fs.readFile(jsonPath, 'utf8');
            const parsed = JSON.parse(data);
            coverageData = this.parseCoverageJson(parsed);
          } catch {
            return {
              success: false,
              error: 'Failed to read JSON coverage report',
            };
          }
          break;
        }
        case 'lcov': {
          const lcovPath = path.join(coveragePath, 'lcov.info');
          try {
            const data = await fs.readFile(lcovPath, 'utf8');
            coverageData = this.parseLcov(data);
          } catch {
            return {
              success: false,
              error: 'Failed to read LCOV coverage report',
            };
          }
          break;
        }
        case 'text':
        case 'html': {
          return {
            success: true,
            message: `${request.format.toUpperCase()} coverage report available at ${coveragePath}`,
            data: undefined,
          };
        }
      }

      return {
        success: true,
        message: 'Coverage report retrieved successfully',
        data: coverageData,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to get coverage: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Build test command based on framework
   */
  private buildTestCommand(request: RunTestsRequest): { cmd: string; args: string[] } | null {
    const baseArgs = [...request.args];

    if (request.coverage) {
      switch (request.framework) {
        case 'jest':
          baseArgs.push('--coverage');
          break;
        case 'vitest':
          baseArgs.push('--coverage');
          break;
        case 'pytest':
          baseArgs.push('--cov');
          break;
      }
    }

    if (request.testPath) {
      baseArgs.push(request.testPath);
    }

    switch (request.framework) {
      case 'jest':
        return { cmd: 'npx', args: ['jest', ...baseArgs] };
      case 'vitest':
        return { cmd: 'npx', args: ['vitest', 'run', ...baseArgs] };
      case 'pytest':
        return { cmd: 'python', args: ['-m', 'pytest', ...baseArgs] };
      case 'xunit':
        return { cmd: 'dotnet', args: ['test', ...baseArgs] };
      case 'mocha':
        return { cmd: 'npx', args: ['mocha', ...baseArgs] };
      case 'ava':
        return { cmd: 'npx', args: ['ava', ...baseArgs] };
      default:
        return null;
    }
  }

  /**
   * Execute test command
   */
  private async executeTest(
    command: { cmd: string; args: string[] },
    cwd: string,
    timeout: number
  ): Promise<TestOperationResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      let stdout = '';
      let stderr = '';

      const proc = spawn(command.cmd, command.args, {
        cwd,
        shell: true,
        timeout,
      });

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        const duration = Date.now() - startTime;
        const output = stdout + stderr;

        // Parse test results from output
        const testResult = this.parseTestOutput(output, command.args[0] || 'unknown');

        if (code === 0 || testResult.failedTests === 0) {
          resolve({
            success: true,
            message: `Tests completed successfully in ${duration}ms`,
            data: {
              ...testResult,
              duration,
              success: true,
            },
          });
        } else {
          resolve({
            success: false,
            error: `Tests failed with exit code ${code ?? 'unknown'}`,
            data: {
              ...testResult,
              duration,
              success: false,
            },
          });
        }
      });

      proc.on('error', (error) => {
        resolve({
          success: false,
          error: `Test execution error: ${error.message}`,
        });
      });
    });
  }

  /**
   * Parse test output to extract results
   */
  private parseTestOutput(output: string, framework: string): Omit<TestResult, 'duration' | 'success'> {
    const result: Omit<TestResult, 'duration' | 'success'> = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      failures: [],
    };

    // Jest/Vitest output patterns
    const jestPatterns = {
      total: /Tests:\s+(\d+)\s+total/,
      passed: /(\d+)\s+passed/,
      failed: /(\d+)\s+failed/,
      skipped: /(\d+)\s+skipped/,
    };

    // Pytest output patterns
    const pytestPatterns = {
      summary: /=+\s*(\d+)\s+passed(?:,\s*(\d+)\s+failed)?(?:,\s*(\d+)\s+skipped)?/,
    };

    if (framework === 'jest' || framework === 'vitest') {
      const totalMatch = output.match(jestPatterns.total);
      const passedMatch = output.match(jestPatterns.passed);
      const failedMatch = output.match(jestPatterns.failed);
      const skippedMatch = output.match(jestPatterns.skipped);

      result.totalTests = totalMatch ? parseInt(totalMatch[1] || '0', 10) : 0;
      result.passedTests = passedMatch ? parseInt(passedMatch[1] || '0', 10) : 0;
      result.failedTests = failedMatch ? parseInt(failedMatch[1] || '0', 10) : 0;
      result.skippedTests = skippedMatch ? parseInt(skippedMatch[1] || '0', 10) : 0;
    } else if (framework === 'pytest') {
      const summaryMatch = output.match(pytestPatterns.summary);
      if (summaryMatch) {
        result.passedTests = parseInt(summaryMatch[1] || '0', 10);
        result.failedTests = parseInt(summaryMatch[2] || '0', 10);
        result.skippedTests = parseInt(summaryMatch[3] || '0', 10);
        result.totalTests = result.passedTests + result.failedTests + result.skippedTests;
      }
    }

    // Parse failures (basic implementation)
    const failureMatches = output.matchAll(/●\s+(.+?)\n\n\s+(.+?)(?=\n\n|$)/gs);
    for (const match of failureMatches) {
      result.failures?.push({
        testName: match[1]?.trim() || 'Unknown test',
        errorMessage: match[2]?.trim() || 'Unknown error',
      });
    }

    return result;
  }

  /**
   * Parse JSON coverage report
   */
  private parseCoverageJson(data: any): CoverageReport {
    const total = data.total || {};

    return {
      lines: {
        total: total.lines?.total || 0,
        covered: total.lines?.covered || 0,
        percentage: total.lines?.pct || 0,
      },
      statements: {
        total: total.statements?.total || 0,
        covered: total.statements?.covered || 0,
        percentage: total.statements?.pct || 0,
      },
      functions: {
        total: total.functions?.total || 0,
        covered: total.functions?.covered || 0,
        percentage: total.functions?.pct || 0,
      },
      branches: {
        total: total.branches?.total || 0,
        covered: total.branches?.covered || 0,
        percentage: total.branches?.pct || 0,
      },
    };
  }

  /**
   * Parse LCOV coverage report
   */
  private parseLcov(data: string): CoverageReport {
    const lines = data.split('\n');
    let totalLines = 0;
    let coveredLines = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalBranches = 0;
    let coveredBranches = 0;

    for (const line of lines) {
      if (line.startsWith('LF:')) {
        totalLines += parseInt(line.substring(3), 10);
      } else if (line.startsWith('LH:')) {
        coveredLines += parseInt(line.substring(3), 10);
      } else if (line.startsWith('FNF:')) {
        totalFunctions += parseInt(line.substring(4), 10);
      } else if (line.startsWith('FNH:')) {
        coveredFunctions += parseInt(line.substring(4), 10);
      } else if (line.startsWith('BRF:')) {
        totalBranches += parseInt(line.substring(4), 10);
      } else if (line.startsWith('BRH:')) {
        coveredBranches += parseInt(line.substring(4), 10);
      }
    }

    return {
      lines: {
        total: totalLines,
        covered: coveredLines,
        percentage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
      },
      statements: {
        total: totalLines,
        covered: coveredLines,
        percentage: totalLines > 0 ? (coveredLines / totalLines) * 100 : 0,
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        percentage: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0,
      },
      branches: {
        total: totalBranches,
        covered: coveredBranches,
        percentage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0,
      },
    };
  }
}
