import { describe, it, expect } from 'vitest';
import {
  ModelProvider,
  LocalProviderType,
  TaskPriority,
  TaskStatus,
  TaskType,
  AlertSeverity,
} from './index.js';

describe('Types Package', () => {
  describe('Enums', () => {
    it('should have correct ModelProvider values', () => {
      expect(ModelProvider.ANTHROPIC).toBe('anthropic');
      expect(ModelProvider.OPENAI).toBe('openai');
      expect(ModelProvider.AZURE_OPENAI).toBe('azure-openai');
      expect(ModelProvider.LOCAL).toBe('local');
    });

    it('should have correct LocalProviderType values', () => {
      expect(LocalProviderType.VLLM).toBe('vllm');
      expect(LocalProviderType.OLLAMA).toBe('ollama');
      expect(LocalProviderType.TGI).toBe('tgi');
    });

    it('should have correct TaskPriority values', () => {
      expect(TaskPriority.P0).toBe('P0');
      expect(TaskPriority.P1).toBe('P1');
      expect(TaskPriority.P2).toBe('P2');
      expect(TaskPriority.P3).toBe('P3');
    });

    it('should have correct TaskStatus values', () => {
      expect(TaskStatus.PENDING).toBe('pending');
      expect(TaskStatus.QUEUED).toBe('queued');
      expect(TaskStatus.RUNNING).toBe('running');
      expect(TaskStatus.COMPLETED).toBe('completed');
      expect(TaskStatus.FAILED).toBe('failed');
      expect(TaskStatus.CANCELLED).toBe('cancelled');
      expect(TaskStatus.RETRYING).toBe('retrying');
    });

    it('should have correct TaskType values', () => {
      expect(TaskType.CODE_GENERATION).toBe('code_generation');
      expect(TaskType.CODE_REVIEW).toBe('code_review');
      expect(TaskType.BUG_FIX).toBe('bug_fix');
      expect(TaskType.TESTING).toBe('testing');
      expect(TaskType.DOCUMENTATION).toBe('documentation');
      expect(TaskType.ANALYSIS).toBe('analysis');
      expect(TaskType.CUSTOM).toBe('custom');
    });

    it('should have correct AlertSeverity values', () => {
      expect(AlertSeverity.INFO).toBe('info');
      expect(AlertSeverity.WARNING).toBe('warning');
      expect(AlertSeverity.ERROR).toBe('error');
      expect(AlertSeverity.CRITICAL).toBe('critical');
    });
  });

  describe('Type Inference', () => {
    it('should infer Task type correctly', () => {
      const task = {
        id: 'task-123',
        type: TaskType.CODE_GENERATION,
        priority: TaskPriority.P1,
        status: TaskStatus.PENDING,
        input: { prompt: 'Generate code' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      expect(task.id).toBe('task-123');
      expect(task.type).toBe(TaskType.CODE_GENERATION);
    });

    it('should infer RoutingDecision type correctly', () => {
      const decision = {
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
      };

      expect(decision.provider).toBe(ModelProvider.ANTHROPIC);
      expect(decision.model).toBe('claude-3-5-sonnet-20241022');
    });

    it('should infer AgentTool type correctly', () => {
      const tool = {
        name: 'read_file',
        description: 'Read a file from the filesystem',
        parameters: {
          type: 'object' as const,
          properties: {
            path: {
              type: 'string' as const,
              description: 'Path to the file',
            },
          },
          required: ['path'],
        },
      };

      expect(tool.name).toBe('read_file');
      expect(tool.parameters.type).toBe('object');
    });
  });

  describe('Type Compatibility', () => {
    it('should allow ProviderConfig to be extended', () => {
      const config = {
        provider: ModelProvider.ANTHROPIC,
        apiKey: 'sk-ant-123',
        baseUrl: 'https://api.anthropic.com',
        timeout: 30000,
        maxRetries: 3,
      };

      expect(config.provider).toBe(ModelProvider.ANTHROPIC);
    });

    it('should allow LocalProviderConfig to extend ProviderConfig', () => {
      const localConfig = {
        provider: ModelProvider.LOCAL,
        providerType: LocalProviderType.OLLAMA,
        baseUrl: 'http://localhost:11434',
        modelPath: '/models/llama2',
        gpuLayers: 32,
      };

      expect(localConfig.provider).toBe(ModelProvider.LOCAL);
      expect(localConfig.providerType).toBe(LocalProviderType.OLLAMA);
    });
  });
});
