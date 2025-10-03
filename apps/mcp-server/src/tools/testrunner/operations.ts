import { spawn } from 'node:child_process';
import type { TestRunnerGuard } from './guards.js';
import type { RunTestsRequest, GetCoverageRequest, ToolResult } from './types.js';

export class TestRunnerOperations {
  constructor(private guard: TestRunnerGuard) {}

  async runTests(request: RunTestsRequest): Promise<ToolResult> {
    // Validate framework
    if (!this.guard.isFrameworkAllowed(request.framework)) {
      return { success: false, error: `Framework ${request.framework} is not allowed` };
    }

    // Validate args
    if (request.args) {
      const argsValidation = this.guard.validateTestArgs(request.args);
      if (!argsValidation.valid) {
        return { success: false, error: argsValidation.error };
      }
    }

    // Validate working directory
    if (request.cwd) {
      const cwdValidation = this.guard.validateWorkingDirectory(request.cwd);
      if (!cwdValidation.valid) {
        return { success: false, error: cwdValidation.error };
      }
    }

    const timeout = this.guard.getSafeTimeout(request.timeout);
    const retryCount = this.guard.getSafeRetryCount(request.retry !== false);

    // Build command based on framework
    const { command, args } = this.buildTestCommand(request);

    try {
      const result = await this.executeTest(command, args, request.cwd, timeout);
      return {
        success: result.exitCode === 0,
        data: {
          exitCode: result.exitCode,
          stdout: result.stdout,
          stderr: result.stderr,
          framework: request.framework,
          timeout,
          retries: retryCount,
        },
      };
    } catch (error: any) {
      return { success: false, error: error.message || 'Test execution failed' };
    }
  }

  async getCoverage(_request: GetCoverageRequest): Promise<ToolResult> {
    // In a real implementation, this would read coverage files from the coverage directory
    // For now, return a not found error as coverage may not exist
    return {
      success: false,
      error: 'Coverage data not found. Run tests with coverage enabled first.',
    };
  }

  private buildTestCommand(request: RunTestsRequest): { command: string; args: string[] } {
    const baseArgs: string[] = [];

    switch (request.framework) {
      case 'jest':
        baseArgs.push(...(request.coverage ? ['--coverage'] : []));
        if (request.testPath) baseArgs.push(request.testPath);
        return { command: 'npx', args: ['jest', ...baseArgs, ...(request.args || [])] };

      case 'vitest':
        baseArgs.push('run');
        if (request.coverage) baseArgs.push('--coverage');
        if (request.testPath) baseArgs.push(request.testPath);
        return { command: 'npx', args: ['vitest', ...baseArgs, ...(request.args || [])] };

      case 'pytest':
        if (request.coverage) baseArgs.push('--cov');
        if (request.testPath) baseArgs.push(request.testPath);
        return { command: 'pytest', args: [...baseArgs, ...(request.args || [])] };

      case 'xunit':
      case 'mocha':
      case 'ava':
      default:
        return { command: request.framework, args: request.args || [] };
    }
  }

  private executeTest(
    command: string,
    args: string[],
    cwd: string | undefined,
    timeout: number
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const childProcess = spawn(command, args, {
        cwd: cwd || process.cwd(),
        shell: true,
        timeout,
      });

      let stdout = '';
      let stderr = '';

      childProcess.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      childProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      childProcess.on('close', (code: number | null) => {
        resolve({
          exitCode: code || 0,
          stdout,
          stderr,
        });
      });

      childProcess.on('error', (error: Error) => {
        reject(error);
      });
    });
  }
}
