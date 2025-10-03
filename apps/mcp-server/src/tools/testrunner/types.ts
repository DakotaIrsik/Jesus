import { z } from 'zod';

/**
 * Configuration for test runner tool
 */
export const TestRunnerConfigSchema = z.object({
  /** Default timeout for test execution in ms */
  defaultTimeout: z.number().default(300000), // 5 minutes
  /** Enable coverage collection */
  enableCoverage: z.boolean().default(true),
  /** Max retry attempts for flaky tests */
  maxRetries: z.number().default(2),
  /** Allowed test frameworks */
  allowedFrameworks: z
    .array(z.enum(['jest', 'vitest', 'pytest', 'xunit', 'mocha', 'ava']))
    .default(['jest', 'vitest', 'pytest', 'xunit']),
});

export type TestRunnerConfig = z.infer<typeof TestRunnerConfigSchema>;

/**
 * Test execution request schema
 */
export const RunTestsRequestSchema = z.object({
  /** Test framework to use */
  framework: z.enum(['jest', 'vitest', 'pytest', 'xunit', 'mocha', 'ava']),
  /** Test path or pattern */
  testPath: z.string().optional(),
  /** Additional CLI arguments */
  args: z.array(z.string()).default([]),
  /** Enable coverage collection */
  coverage: z.boolean().default(true),
  /** Timeout in milliseconds */
  timeout: z.number().optional(),
  /** Retry flaky tests */
  retry: z.boolean().default(true),
  /** Working directory */
  cwd: z.string().optional(),
});

export type RunTestsRequest = z.infer<typeof RunTestsRequestSchema>;

/**
 * Coverage report request schema
 */
export const GetCoverageRequestSchema = z.object({
  /** Coverage report format */
  format: z.enum(['json', 'lcov', 'html', 'text']).default('json'),
  /** Output path for coverage report */
  outputPath: z.string().optional(),
});

export type GetCoverageRequest = z.infer<typeof GetCoverageRequestSchema>;

/**
 * Test result
 */
export interface TestResult {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  failures?: TestFailure[];
  coverage?: CoverageReport;
}

/**
 * Test failure details
 */
export interface TestFailure {
  testName: string;
  errorMessage: string;
  stackTrace?: string;
  filePath?: string;
  lineNumber?: number;
}

/**
 * Coverage report
 */
export interface CoverageReport {
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
  files?: FileCoverage[];
}

/**
 * Coverage metric
 */
export interface CoverageMetric {
  total: number;
  covered: number;
  percentage: number;
}

/**
 * File coverage details
 */
export interface FileCoverage {
  path: string;
  lines: CoverageMetric;
  statements: CoverageMetric;
  functions: CoverageMetric;
  branches: CoverageMetric;
}

/**
 * Test operation result
 */
export interface TestOperationResult {
  success: boolean;
  message?: string;
  data?: TestResult | CoverageReport;
  error?: string;
}
