/**
 * Supported AI model providers
 */
export enum ModelProvider {
  ANTHROPIC = 'anthropic',
  OPENAI = 'openai',
  AZURE_OPENAI = 'azure-openai',
  LOCAL = 'local',
}

/**
 * Local model provider types
 */
export enum LocalProviderType {
  VLLM = 'vllm',
  OLLAMA = 'ollama',
  TGI = 'tgi',
}

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  provider: ModelProvider;
  apiKey?: string;
  baseUrl?: string;
  organization?: string;
  timeout?: number;
  maxRetries?: number;
}

/**
 * Local provider specific configuration
 */
export interface LocalProviderConfig extends ProviderConfig {
  provider: ModelProvider.LOCAL;
  providerType: LocalProviderType;
  modelPath?: string;
  gpuLayers?: number;
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  provider: ModelProvider;
  healthy: boolean;
  latencyMs?: number;
  lastChecked: Date;
  error?: string;
}
