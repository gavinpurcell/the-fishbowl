import type { ProviderType } from '@/engine/types';

export interface ModelOption {
  id: string;
  label: string;
  provider: ProviderType;
  tier: 'fast' | 'balanced' | 'smartest';
  inputPer1M: number;
  outputPer1M: number;
}

const MODELS: ModelOption[] = [
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', provider: 'claude', tier: 'fast', inputPer1M: 1.00, outputPer1M: 5.00 },
  { id: 'claude-sonnet-4-6-20250514', label: 'Sonnet 4.6', provider: 'claude', tier: 'balanced', inputPer1M: 3.00, outputPer1M: 15.00 },
  { id: 'claude-opus-4-6-20250514', label: 'Opus 4.6', provider: 'claude', tier: 'smartest', inputPer1M: 15.00, outputPer1M: 75.00 },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', tier: 'fast', inputPer1M: 0.15, outputPer1M: 0.60 },
  { id: 'gpt-5', label: 'GPT-5', provider: 'openai', tier: 'balanced', inputPer1M: 1.25, outputPer1M: 10.00 },
  { id: 'gpt-5.2', label: 'GPT-5.2', provider: 'openai', tier: 'smartest', inputPer1M: 1.75, outputPer1M: 14.00 },
  // Claude Code (Local) — no API cost, uses Pro/Max subscription credits
  { id: 'haiku', label: 'Haiku (Local)', provider: 'claude-code', tier: 'fast', inputPer1M: 0, outputPer1M: 0 },
  { id: 'sonnet', label: 'Sonnet (Local)', provider: 'claude-code', tier: 'balanced', inputPer1M: 0, outputPer1M: 0 },
  { id: 'opus', label: 'Opus (Local)', provider: 'claude-code', tier: 'smartest', inputPer1M: 0, outputPer1M: 0 },
];

export function getModelsForProvider(provider: ProviderType): ModelOption[] {
  return MODELS.filter((m) => m.provider === provider);
}

export function getDefaultModel(provider: ProviderType): ModelOption {
  return MODELS.find((m) => m.provider === provider && m.tier === 'balanced')
    || MODELS.find((m) => m.provider === provider)!;
}

export function getModelById(id: string): ModelOption | undefined {
  return MODELS.find((m) => m.id === id);
}

export function estimateSessionCost(
  modelId: string,
  panelistCount: number
): { low: number; high: number } {
  const model = getModelById(modelId);
  if (!model) return { low: 0, high: 0 };

  const avgInputTokens = 500;
  const avgOutputTokens = 267;

  const lowResponses = panelistCount * 4 + panelistCount;
  const highResponses = panelistCount * 4 + panelistCount * 3;

  const costPerResponse =
    (avgInputTokens / 1_000_000) * model.inputPer1M +
    (avgOutputTokens / 1_000_000) * model.outputPer1M;

  return {
    low: Math.round(lowResponses * costPerResponse * 100) / 100,
    high: Math.round(highResponses * costPerResponse * 100) / 100,
  };
}

export function formatCost(dollars: number): string {
  if (dollars < 0.01) return '$0.00';
  return `$${dollars.toFixed(2)}`;
}

export function formatTokens(count: number): string {
  if (count < 1000) return `${count}`;
  return `${(count / 1000).toFixed(1)}K`;
}
