import type { TaskContext } from './task.js';

/**
 * Agent tool definition
 */
export interface AgentTool {
  name: string;
  description: string;
  parameters: ToolParameters;
  handler?: ToolHandler;
}

/**
 * Tool parameters schema
 */
export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolParameterProperty>;
  required?: string[];
}

/**
 * Tool parameter property
 */
export interface ToolParameterProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description: string;
  enum?: unknown[];
  items?: ToolParameterProperty;
  properties?: Record<string, ToolParameterProperty>;
}

/**
 * Tool handler function
 */
export type ToolHandler = (
  params: Record<string, unknown>,
  context: TaskContext
) => Promise<ToolResult>;

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Agent configuration
 */
export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt?: string;
  tools: AgentTool[];
  maxIterations?: number;
  enableParallelToolCalls?: boolean;
}

/**
 * Agent execution state
 */
export interface AgentState {
  agentId: string;
  taskId: string;
  iteration: number;
  toolCalls: ToolCall[];
  checkpoints: AgentCheckpoint[];
  context: TaskContext;
}

/**
 * Tool call record
 */
export interface ToolCall {
  id: string;
  toolName: string;
  parameters: Record<string, unknown>;
  result?: ToolResult;
  timestamp: Date;
  durationMs?: number;
}

/**
 * Agent checkpoint for retry/recovery
 */
export interface AgentCheckpoint {
  id: string;
  iteration: number;
  state: unknown;
  timestamp: Date;
}
