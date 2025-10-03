import type { ModelProvider } from './provider.js';

/**
 * Task priority levels
 */
export enum TaskPriority {
  P0 = 'P0',
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
}

/**
 * Task status
 */
export enum TaskStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRYING = 'retrying',
}

/**
 * Task type classification
 */
export enum TaskType {
  CODE_GENERATION = 'code_generation',
  CODE_REVIEW = 'code_review',
  BUG_FIX = 'bug_fix',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  ANALYSIS = 'analysis',
  CUSTOM = 'custom',
}

/**
 * Attribution metadata for cost tracking
 */
export interface AttributionMetadata {
  project?: string;
  owner?: string;
  team?: string;
  issue?: string;
  costCenter?: string;
  tags?: Record<string, string>;
}

/**
 * SLA requirements for task execution
 */
export interface TaskSLA {
  maxLatencyMs?: number;
  maxCostUsd?: number;
  maxRetries?: number;
  timeoutMs?: number;
}

/**
 * Task configuration
 */
export interface Task {
  id: string;
  type: TaskType;
  priority: TaskPriority;
  status: TaskStatus;
  input: unknown;
  output?: unknown;
  error?: string;
  attribution?: AttributionMetadata;
  sla?: TaskSLA;
  preferredProvider?: ModelProvider;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

/**
 * Task execution context
 */
export interface TaskContext {
  taskId: string;
  correlationId: string;
  retryCount: number;
  checkpointData?: unknown;
}

/**
 * Task result
 */
export interface TaskResult<T = unknown> {
  taskId: string;
  status: TaskStatus;
  output?: T;
  error?: string;
  metrics: {
    durationMs: number;
    cost?: number;
    tokensUsed?: number;
  };
}
