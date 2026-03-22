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
      className="rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-4">
        {/* Cost icon */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'var(--bg-elevated)' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-gold)' }}>
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
        </div>
        <div>
          <div className="label-mono text-[10px] mb-1" style={{ color: 'var(--text-muted)' }}>
            SESSION COST
          </div>
          <div className="text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {isOllama ? 'Free' : `$${totalCost.toFixed(4)}`}
          </div>
        </div>
      </div>
      <div className="sm:text-right space-y-1">
        <div className="label-mono text-[11px] flex sm:justify-end gap-3" style={{ color: 'var(--text-secondary)' }}>
          <span>
            <span style={{ color: 'var(--text-muted)' }}>In:</span>{' '}
            {sessionCost.inputTokens.toLocaleString()}
          </span>
          <span>
            <span style={{ color: 'var(--text-muted)' }}>Out:</span>{' '}
            {sessionCost.outputTokens.toLocaleString()}
          </span>
        </div>
        <div className="label-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          <span style={{ color: 'var(--text-muted)' }}>Model:</span>{' '}
          {model?.label ?? modelId}
          {' · '}
          <span style={{ color: 'var(--text-muted)' }}>Provider:</span>{' '}
          {provider.charAt(0).toUpperCase() + provider.slice(1)}
        </div>
      </div>
    </div>
  );
}
