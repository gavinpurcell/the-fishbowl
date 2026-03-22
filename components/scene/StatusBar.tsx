'use client';

import type { RoundType } from '@/engine/types';
import { formatCost, formatTokens } from '@/lib/models';

interface Props {
  round: RoundType;
  panelistsSpoken: number;
  totalPanelists: number;
  onWrapUp: () => void;
  canWrapUp: boolean;
  modelLabel?: string;
  costDollars?: number;
  totalTokens?: number;
  isOllama?: boolean;
}

const ROUND_LABELS: Record<RoundType, string> = {
  'initial-takes': 'Round 1 — Initial Takes',
  'cross-talk': 'Round 2 — Cross-Talk',
  'moderation': 'Round 3 — Moderation',
  'wrap-up': 'Final Takeaways',
  'summary': 'Generating Summary...',
};

export default function StatusBar({ round, panelistsSpoken, totalPanelists, onWrapUp, canWrapUp, modelLabel, costDollars, totalTokens, isOllama }: Props) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-5 py-2.5 max-w-[800px] mx-auto rounded-b-xl"
      style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-gold)' }} />
        <span className="label-mono" style={{ fontSize: '10px', color: 'var(--accent-gold)' }}>
          {ROUND_LABELS[round]}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
        {modelLabel && (
          <span className="hidden sm:inline text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {modelLabel}
          </span>
        )}
        {totalTokens != null && totalTokens > 0 && (
          <span className="hidden sm:inline text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            {isOllama ? 'Free (local)' : `${formatCost(costDollars || 0)} · ${formatTokens(totalTokens)} tokens`}
          </span>
        )}
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {panelistsSpoken}/{totalPanelists} spoke
        </span>
        {canWrapUp && (
          <button
            onClick={onWrapUp}
            style={{
              background: 'var(--accent-gold)',
              color: 'white',
              fontFamily: "'Outfit', sans-serif",
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 14px',
              borderRadius: '8px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(196, 154, 42, 0.4)',
            }}
          >
            <span className="hidden sm:inline">I&apos;m Done Asking Questions</span>
            <span className="sm:hidden">Wrap Up</span>
          </button>
        )}
      </div>
    </div>
  );
}
