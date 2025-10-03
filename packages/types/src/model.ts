import type { ModelProvider } from './provider.js';

/**
 * Model capabilities
 */
export interface ModelCapabilities {
  supportsTools: boolean;
  supportsVision: boolean;
  supportsStreaming: boolean;
  supportsBatch: boolean;
  maxContextLength: number;
  maxOutputTokens: number;
}

/**
 * Model configuration
 */
export interface ModelConfig {
  provider: ModelProvider;
  modelId: string;
  displayName?: string;
  capabilities: ModelCapabilities;
  costPerInputToken?: number;
  costPerOutputToken?: number;
  isDefault?: boolean;
}

/**
 * Model selection criteria
 */
export interface ModelSelectionCriteria {
  requiresTools?: boolean;
  requiresVision?: boolean;
  minContextLength?: number;
  maxCostPerToken?: number;
  preferredProvider?: ModelProvider;
  excludeProviders?: ModelProvider[];
}

/**
 * Model usage metrics
 */
export interface ModelUsageMetrics {
  modelId: string;
  provider: ModelProvider;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  timestamp: Date;
}
