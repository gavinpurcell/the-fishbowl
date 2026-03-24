import type { LLMProvider } from './types';
import type { ProviderType } from '@/engine/types';
import { ClaudeProvider } from './claude';
import { ClaudeCodeProvider } from './claude-code';

export function createProvider(type: ProviderType, apiKey: string, modelId?: string): LLMProvider {
  switch (type) {
    case 'claude':
      return new ClaudeProvider(apiKey, modelId);
    case 'claude-code':
      return new ClaudeCodeProvider(modelId);
    default:
      throw new Error(`Unknown provider: ${type}`);
  }
}

export type { LLMProvider, Message } from './types';
