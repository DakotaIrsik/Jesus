import type { ModelProvider } from './provider.js';
import type { TaskType, TaskPriority } from './task.js';

/**
 * Routing policy configuration
 */
export interface RoutingPolicy {
  name: string;
  version: string;
  enabled: boolean;
  rules: RoutingRule[];
}

/**
 * Routing rule
 */
export interface RoutingRule {
  id: string;
  name: string;
  condition: RoutingCondition;
  action: RoutingAction;
  priority: number;
}

/**
 * Routing condition
 */
export interface RoutingCondition {
  taskTypes?: TaskType[];
  priorities?: TaskPriority[];
  costCap?: number;
  latencySloMs?: number;
  contextLengthMin?: number;
  requiresTools?: boolean;
  requiresVision?: boolean;
}

/**
 * Routing action
 */
export interface RoutingAction {
  primaryProvider: ModelProvider;
  primaryModel: string;
  fallbackChain?: {
    provider: ModelProvider;
    model: string;
    trigger: FallbackTrigger;
  }[];
  parameters?: ModelParameters;
}

/**
 * Fallback trigger conditions
 */
export interface FallbackTrigger {
  onError?: boolean;
  onLatencyExceeds?: number;
  onCostExceeds?: number;
  onProviderUnavailable?: boolean;
}

/**
 * Model parameters
 */
export interface ModelParameters {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  stopSequences?: string[];
  presencePenalty?: number;
  frequencyPenalty?: number;
}

/**
 * Routing decision
 */
export interface RoutingDecision {
  taskId: string;
  provider: ModelProvider;
  model: string;
  parameters: ModelParameters;
  fallbackChain: {
    provider: ModelProvider;
    model: string;
  }[];
  reason: string;
  matchedRuleId?: string;
}

/**
 * Canary routing configuration
 */
export interface CanaryConfig {
  enabled: boolean;
  percentage: number;
  candidateProvider: ModelProvider;
  candidateModel: string;
  controlProvider: ModelProvider;
  controlModel: string;
  shadowMode?: boolean;
}
