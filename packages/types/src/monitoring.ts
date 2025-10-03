import type { ModelProvider } from './provider.js';

/**
 * Metrics data point
 */
export interface MetricDataPoint {
  name: string;
  value: number;
  timestamp: Date;
  labels?: Record<string, string>;
}

/**
 * Request metrics
 */
export interface RequestMetrics {
  requestId: string;
  taskId?: string;
  provider: ModelProvider;
  model: string;
  statusCode: number;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

/**
 * System metrics
 */
export interface SystemMetrics {
  qps: number;
  activeRequests: number;
  queueDepth: number;
  errorRate: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  timestamp: Date;
}

/**
 * Cost metrics
 */
export interface CostMetrics {
  totalCostUsd: number;
  costByProvider: Record<ModelProvider, number>;
  costByModel: Record<string, number>;
  costByProject?: Record<string, number>;
  period: {
    start: Date;
    end: Date;
  };
}

/**
 * Alert severity levels
 */
export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

/**
 * Alert definition
 */
export interface Alert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  metric: string;
  threshold: number;
  currentValue?: number;
  timestamp: Date;
  resolved?: boolean;
}

/**
 * Health check result
 */
export interface HealthCheck {
  service: string;
  healthy: boolean;
  checks: Record<string, boolean>;
  message?: string;
  timestamp: Date;
}

/**
 * Trace span
 */
export interface TraceSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  startTime: Date;
  endTime?: Date;
  attributes?: Record<string, unknown>;
  status?: {
    code: 'OK' | 'ERROR';
    message?: string;
  };
}
