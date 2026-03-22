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
    <div className="cost-strip flex-wrap">
      {/* Cost icon */}
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-gold)', flexShrink: 0 }}>
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>

      {/* Label */}
      <span className="cost-strip-label">Cost</span>

      {/* Total */}
      <span className="cost-strip-value">
        {isOllama ? 'Free' : `$${totalCost.toFixed(4)}`}
      </span>

      <span className="cost-strip-divider" />

      {/* Token breakdown */}
      <span className="cost-strip-detail">
        <span style={{ color: 'var(--text-muted)' }}>In:</span>{' '}
        {sessionCost.inputTokens.toLocaleString()}
      </span>
      <span className="cost-strip-detail">
        <span style={{ color: 'var(--text-muted)' }}>Out:</span>{' '}
        {sessionCost.outputTokens.toLocaleString()}
      </span>

      <span className="cost-strip-divider hidden sm:block" />

      {/* Model info */}
      <span className="cost-strip-detail hidden sm:inline">
        {model?.label ?? modelId}
        {' / '}
        {provider.charAt(0).toUpperCase() + provider.slice(1)}
      </span>
    </div>
  );
}
