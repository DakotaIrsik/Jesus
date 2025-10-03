# @jesus/types

Shared TypeScript types and interfaces for the Jesus AI agent orchestration platform.

## Overview

This package provides core type definitions used across the platform, including:

- **Provider types**: AI model provider configurations and health status
- **Model types**: Model capabilities, configuration, and usage metrics
- **Task types**: Task definitions, status, priorities, and execution context
- **Routing types**: Routing policies, decisions, and canary configurations
- **Agent types**: Agent configuration, tools, state, and checkpoints
- **Monitoring types**: Metrics, alerts, health checks, and tracing

## Installation

```bash
pnpm add @jesus/types
```

## Usage

### Import types

```typescript
import {
  ModelProvider,
  Task,
  TaskStatus,
  TaskPriority,
  RoutingDecision,
  AgentTool,
  ModelUsageMetrics,
} from '@jesus/types';
```

### Example: Task Definition

```typescript
import { Task, TaskType, TaskPriority, TaskStatus } from '@jesus/types';

const task: Task = {
  id: 'task-123',
  type: TaskType.CODE_GENERATION,
  priority: TaskPriority.P1,
  status: TaskStatus.PENDING,
  input: {
    prompt: 'Generate a TypeScript function to validate email addresses',
  },
  attribution: {
    project: 'my-project',
    owner: 'john@example.com',
    team: 'engineering',
  },
  sla: {
    maxLatencyMs: 5000,
    maxCostUsd: 0.1,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

### Example: Routing Decision

```typescript
import { RoutingDecision, ModelProvider } from '@jesus/types';

const decision: RoutingDecision = {
  taskId: 'task-123',
  provider: ModelProvider.ANTHROPIC,
  model: 'claude-3-5-sonnet-20241022',
  parameters: {
    temperature: 0.7,
    maxTokens: 4096,
  },
  fallbackChain: [
    {
      provider: ModelProvider.OPENAI,
      model: 'gpt-4',
    },
  ],
  reason: 'Selected based on task type and cost constraints',
  matchedRuleId: 'rule-code-gen-p1',
};
```

### Example: Agent Tool Definition

```typescript
import { AgentTool, ToolResult } from '@jesus/types';

const readFileTool: AgentTool = {
  name: 'read_file',
  description: 'Read contents of a file',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read',
      },
    },
    required: ['path'],
  },
  handler: async (params, context): Promise<ToolResult> => {
    try {
      const content = await readFileImpl(params.path as string);
      return {
        success: true,
        data: { content },
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  },
};
```

## Type Categories

### Provider Types

- `ModelProvider` - Enum of supported providers (Anthropic, OpenAI, Azure, Local)
- `ProviderConfig` - Provider configuration interface
- `ProviderHealth` - Provider health status

### Model Types

- `ModelCapabilities` - Model capabilities (tools, vision, streaming, etc.)
- `ModelConfig` - Model configuration and cost data
- `ModelSelectionCriteria` - Criteria for selecting models
- `ModelUsageMetrics` - Usage tracking and metrics

### Task Types

- `TaskPriority` - Priority levels (P0-P3)
- `TaskStatus` - Status enum (pending, running, completed, etc.)
- `TaskType` - Task classification (code generation, review, etc.)
- `Task` - Complete task definition
- `TaskContext` - Execution context with correlation IDs
- `AttributionMetadata` - Cost attribution and tagging

### Routing Types

- `RoutingPolicy` - Policy configuration with rules
- `RoutingRule` - Individual routing rule
- `RoutingDecision` - Routing decision output
- `CanaryConfig` - Canary deployment configuration

### Agent Types

- `AgentTool` - Tool definition with parameters and handler
- `AgentConfig` - Agent configuration
- `AgentState` - Agent execution state
- `AgentCheckpoint` - State checkpoint for recovery

### Monitoring Types

- `MetricDataPoint` - Time-series metric data
- `RequestMetrics` - Request-level metrics
- `SystemMetrics` - System-wide metrics (QPS, latency percentiles)
- `CostMetrics` - Cost tracking by provider/model/project
- `Alert` - Alert definition with severity
- `TraceSpan` - Distributed tracing span

## Development

```bash
# Build
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint
```

## License

MIT
