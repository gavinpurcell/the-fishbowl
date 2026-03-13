import type { LLMProvider } from './types';
import type { ProviderType } from '@/engine/types';
import { ClaudeProvider } from './claude';
import { OpenAIProvider } from './openai';
import { OllamaProvider } from './ollama';

export function createProvider(type: ProviderType, apiKey: string, modelId?: string): LLMProvider {
  switch (type) {
    case 'claude':
      return new ClaudeProvider(apiKey, modelId);
    case 'openai':
      return new OpenAIProvider(apiKey, modelId);
    case 'ollama':
      return new OllamaProvider(modelId);
    default:
      throw new Error(`Unknown provider: ${type}`);
  }
}

export type { LLMProvider, Message } from './types';
