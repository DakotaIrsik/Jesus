# ADR-003: Model Adapter Interface and Plugin Architecture

**Status**: Accepted
**Date**: 2025-10-03
**Authors**: Jesus Platform Team
**Relates to**: Issues #5, #11, #12, #13

## Context

The Jesus platform must support multiple AI model providers:
- **Cloud APIs**: Anthropic Claude, OpenAI GPT-4, Google Gemini, Cohere
- **Local Models**: llama.cpp, vLLM, Ollama, TGI (Text Generation Inference)
- **Custom Models**: Organization-specific fine-tuned models

Each provider has different:
- API interfaces (REST, gRPC, proprietary SDKs)
- Authentication mechanisms (API keys, OAuth, custom)
- Rate limiting policies
- Pricing models
- Capabilities (streaming, function calling, vision, etc.)

We need a **standardized adapter interface** that:
1. Abstracts provider differences behind uniform API
2. Supports dynamic plugin loading without core system changes
3. Enables intelligent routing and fallback chains
4. Tracks costs and token usage consistently
5. Handles provider-specific features (streaming, tools, vision) gracefully

## Decision

We will implement a **plugin-based model adapter architecture** with the following design:

### Core Interface

```typescript
interface ModelAdapter {
  // Metadata
  readonly providerId: string;           // "anthropic", "openai", "local-llama"
  readonly modelId: string;              // "claude-3-5-sonnet", "gpt-4-turbo"
  readonly capabilities: ModelCapabilities;

  // Core Operations
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterable<CompletionChunk>;

  // Health & Status
  healthCheck(): Promise<HealthStatus>;
  getMetrics(): ModelMetrics;

  // Lifecycle
  initialize(config: AdapterConfig): Promise<void>;
  shutdown(): Promise<void>;
}

interface ModelCapabilities {
  streaming: boolean;
  functionCalling: boolean;
  vision: boolean;
  maxTokens: number;
  contextWindow: number;
  supportedModes: Array<'text' | 'chat' | 'completion'>;
}

interface CompletionRequest {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  tools?: Tool[];
  metadata: RequestMetadata;
}

interface CompletionResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'tool_use' | 'error';
  usage: TokenUsage;
  toolCalls?: ToolCall[];
  metadata: ResponseMetadata;
}

interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCost?: number;  // USD
}
```

### Plugin Discovery

```typescript
// Adapters register themselves on startup
class AdapterRegistry {
  register(adapter: ModelAdapter): void;
  get(providerId: string, modelId: string): ModelAdapter | null;
  listAdapters(): AdapterInfo[];

  // Health checking
  checkHealth(providerId: string): Promise<HealthStatus>;
}

// Auto-discovery via directory scanning
// Place adapters in: packages/adapters/{provider}/
```

### Configuration Schema

```yaml
adapters:
  - provider: anthropic
    models:
      - id: claude-3-5-sonnet-20241022
        apiKey: ${ANTHROPIC_API_KEY}
        maxConcurrency: 10
        timeout: 30s
        costPerMillionTokens:
          input: 3.00
          output: 15.00

  - provider: openai
    models:
      - id: gpt-4-turbo
        apiKey: ${OPENAI_API_KEY}
        organization: ${OPENAI_ORG}
        maxConcurrency: 5
        timeout: 60s

  - provider: local-vllm
    models:
      - id: meta-llama-3.1-70b
        endpoint: http://localhost:8000
        gpuMemory: 40GB
        concurrency: 2
```

## Consequences

### Positive

1. **Extensibility**: Add new providers without modifying core router/runner
2. **Testability**: Mock adapters for testing without real API calls
3. **Consistent Interface**: All models exposed through uniform API
4. **Cost Tracking**: Built-in token and cost tracking
5. **Failover**: Easy to switch between providers in fallback chains
6. **Type Safety**: TypeScript interfaces ensure correct implementations
7. **Independent Updates**: Update adapter without deploying entire platform

### Negative

1. **Abstraction Overhead**: Lowest common denominator for features
2. **Provider-Specific Features**: May not expose all unique capabilities
3. **Maintenance Burden**: Need to update adapters when provider APIs change
4. **Performance**: Extra layer of abstraction adds latency (minimal)
5. **Testing Complexity**: Must test each adapter implementation

### Mitigation Strategies

1. **Feature Flags**: Use capabilities interface to expose optional features
2. **Extension Points**: Allow adapters to expose provider-specific metadata
3. **Versioning**: Semantic versioning for adapter interface changes
4. **Automated Tests**: Shared test suite all adapters must pass
5. **Monitoring**: Track adapter-specific error rates and latencies

## Alternatives Considered

### Alternative 1: Provider SDKs Directly in Router
- **Pros**: No abstraction layer, access all provider features
- **Cons**: Tight coupling, difficult to add providers, inconsistent interfaces
- **Rejected**: Too inflexible, violates separation of concerns

### Alternative 2: LangChain/LlamaIndex Integration
- **Pros**: Existing abstraction, large ecosystem
- **Cons**: Heavy dependency, opinionated, may not fit our needs
- **Rejected**: Prefer lightweight custom solution we control

### Alternative 3: OpenAI-Compatible Interface Only
- **Pros**: Many providers support OpenAI API format
- **Cons**: Forces providers into OpenAI shape, misses unique features
- **Rejected**: Too restrictive, limits innovation

### Alternative 4: gRPC Service per Adapter
- **Pros**: Language-agnostic, strong typing, streaming
- **Cons**: Operational overhead, network latency, deployment complexity
- **Rejected**: Over-engineered for current scale

## Implementation Plan

### Phase 1: Core Interface (Week 3)
- Define TypeScript interfaces
- Implement AdapterRegistry
- Create mock adapter for testing

### Phase 2: Cloud Adapters (Week 4)
- Anthropic Claude adapter (#11)
- OpenAI GPT-4 adapter (#12)
- Shared test suite

### Phase 3: Local Adapters (Week 5)
- llama.cpp adapter (#13)
- vLLM adapter
- Health checking

### Phase 4: Advanced Features (Week 6)
- Streaming support
- Function/tool calling
- Vision capabilities (if supported)

## Adapter Implementation Example

```typescript
// packages/adapters/anthropic/src/index.ts
export class AnthropicAdapter implements ModelAdapter {
  readonly providerId = 'anthropic';
  readonly modelId: string;
  readonly capabilities: ModelCapabilities = {
    streaming: true,
    functionCalling: true,
    vision: true,
    maxTokens: 4096,
    contextWindow: 200000,
    supportedModes: ['chat']
  };

  private client: Anthropic;

  async initialize(config: AdapterConfig): Promise<void> {
    this.client = new Anthropic({
      apiKey: config.apiKey,
      maxRetries: 3
    });
    this.modelId = config.modelId;
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await this.client.messages.create({
      model: this.modelId,
      max_tokens: request.maxTokens ?? 1024,
      messages: request.messages,
      tools: request.tools,
      temperature: request.temperature
    });

    return {
      content: this.extractContent(response),
      finishReason: this.mapStopReason(response.stop_reason),
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        estimatedCost: this.calculateCost(response.usage)
      },
      toolCalls: this.extractToolCalls(response),
      metadata: { providerId: this.providerId, modelId: this.modelId }
    };
  }

  async *stream(request: CompletionRequest): AsyncIterable<CompletionChunk> {
    const stream = await this.client.messages.create({
      model: this.modelId,
      max_tokens: request.maxTokens ?? 1024,
      messages: request.messages,
      stream: true
    });

    for await (const chunk of stream) {
      yield this.mapChunk(chunk);
    }
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      // Minimal API call to verify connectivity
      await this.client.messages.create({
        model: this.modelId,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'test' }]
      });
      return { healthy: true, latency: Date.now() - start };
    } catch (error) {
      return { healthy: false, error: error.message };
    }
  }

  private calculateCost(usage: { input_tokens: number; output_tokens: number }): number {
    const INPUT_COST_PER_1M = 3.00;  // $3/MTok for Claude 3.5 Sonnet
    const OUTPUT_COST_PER_1M = 15.00; // $15/MTok

    return (
      (usage.input_tokens / 1_000_000) * INPUT_COST_PER_1M +
      (usage.output_tokens / 1_000_000) * OUTPUT_COST_PER_1M
    );
  }
}
```

## Testing Strategy

**Shared Test Suite** (all adapters must pass):
```typescript
describe('ModelAdapter Contract', () => {
  let adapter: ModelAdapter;

  beforeEach(() => {
    // Each adapter provides test instance
    adapter = createTestAdapter();
  });

  it('should complete simple request', async () => {
    const response = await adapter.complete({
      messages: [{ role: 'user', content: 'Say "hello"' }],
      metadata: { correlationId: 'test-1' }
    });

    expect(response.content).toBeTruthy();
    expect(response.usage.totalTokens).toBeGreaterThan(0);
  });

  it('should handle streaming', async () => {
    const chunks = [];
    for await (const chunk of adapter.stream({
      messages: [{ role: 'user', content: 'Count to 3' }]
    })) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
  });

  it('should pass health check', async () => {
    const health = await adapter.healthCheck();
    expect(health.healthy).toBe(true);
  });
});
```

## Review Date

This decision should be reviewed:
- After implementing 3+ adapters (2026-01-03)
- When adding support for multimodal models (vision, audio)
- If performance becomes bottleneck

## References

- [Anthropic API Docs](https://docs.anthropic.com/en/api/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [vLLM Documentation](https://docs.vllm.ai/)
- [LangChain Model Interface](https://python.langchain.com/docs/concepts/chat_models/)
