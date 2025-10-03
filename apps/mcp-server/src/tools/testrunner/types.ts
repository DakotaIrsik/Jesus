export interface TestRunnerConfig {
  defaultTimeout: number;
  enableCoverage: boolean;
  maxRetries: number;
  allowedFrameworks: string[];
}

export interface RunTestsRequest {
  framework: 'jest' | 'vitest' | 'pytest' | 'xunit' | 'mocha' | 'ava';
  testPath?: string;
  args?: string[];
  coverage?: boolean;
  timeout?: number;
  retry?: boolean;
  cwd?: string;
}

export interface GetCoverageRequest {
  format?: 'json' | 'lcov' | 'html' | 'text';
  outputPath?: string;
}

export interface ToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
