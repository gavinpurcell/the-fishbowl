'use client';

import type { RoundType } from '@/engine/types';

interface Props {
  round: RoundType;
  panelistsSpoken: number;
  totalPanelists: number;
  onWrapUp: () => void;
  canWrapUp: boolean;
}

const ROUND_LABELS: Record<RoundType, string> = {
  'initial-takes': 'Round 1 — Initial Takes',
  'cross-talk': 'Round 2 — Cross-Talk',
  'moderation': 'Round 3 — Moderation',
  'wrap-up': 'Final Takeaways',
  'summary': 'Generating Summary...',
};

export default function StatusBar({ round, panelistsSpoken, totalPanelists, onWrapUp, canWrapUp }: Props) {
  return (
    <div
      className="flex items-center justify-between px-5 py-2.5 max-w-[800px] mx-auto rounded-b-xl"
      style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}
    >
      <div className="flex items-center gap-2.5">
        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-gold)' }} />
        <span className="label-mono" style={{ fontSize: '10px', color: 'var(--accent-gold)' }}>
          {ROUND_LABELS[round]}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {panelistsSpoken}/{totalPanelists} spoke
        </span>
        {canWrapUp && (
          <button
            onClick={onWrapUp}
            className="px-3 py-1 rounded-lg text-xs font-500 transition-all"
            style={{ background: 'var(--accent-warm)', color: 'var(--bg-deep)' }}
          >
            Wrap Up
          </button>
        )}
      </div>
    </div>
  );
}
