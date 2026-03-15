'use client';

import { useFishbowlStore } from '@/lib/store';
import { getModelById } from '@/lib/models';

export default function CostTally() {
  const { sessionCost, modelId, provider } = useFishbowlStore();
  const model = getModelById(modelId);

  const inputCost = model
    ? (sessionCost.inputTokens / 1_000_000) * model.inputPer1M
    : 0;
  const outputCost = model
    ? (sessionCost.outputTokens / 1_000_000) * model.outputPer1M
    : 0;
  const totalCost = inputCost + outputCost;

  const isOllama = provider === 'ollama';

  return (
    <div
      className="rounded-xl p-5 flex items-center justify-between"
      style={{ background: 'var(--bg-surface)' }}
    >
      <div>
        <div className="label-mono text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Session Cost
        </div>
        <div className="text-3xl font-700" style={{ color: 'var(--text-primary)' }}>
          {isOllama ? 'Free' : `$${totalCost.toFixed(2)}`}
        </div>
      </div>
      <div className="text-right">
        <div className="label-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Input:</span>{' '}
          {sessionCost.inputTokens.toLocaleString()} tokens ·{' '}
          <span style={{ color: 'var(--text-muted)' }}>Output:</span>{' '}
          {sessionCost.outputTokens.toLocaleString()} tokens
        </div>
        <div className="label-mono text-[11px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Model:</span>{' '}
          {model?.label ?? modelId} ·{' '}
          <span style={{ color: 'var(--text-muted)' }}>Provider:</span>{' '}
          {provider.charAt(0).toUpperCase() + provider.slice(1)}
        </div>
      </div>
    </div>
  );
}
