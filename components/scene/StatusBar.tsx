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
  'initial-takes': 'Round 1: Initial Takes',
  'cross-talk': 'Round 2: Cross-Talk',
  'moderation': 'Round 3: Moderation',
  'wrap-up': 'Final Takeaways',
  'summary': 'Generating Summary...',
};

export default function StatusBar({ round, panelistsSpoken, totalPanelists, onWrapUp, canWrapUp }: Props) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 text-white text-sm rounded-b-lg max-w-[800px] mx-auto">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
        <span>{ROUND_LABELS[round]}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-gray-400">{panelistsSpoken}/{totalPanelists} spoke</span>
        {canWrapUp && (
          <button
            onClick={onWrapUp}
            className="px-3 py-1 bg-amber-600 text-white rounded text-xs hover:bg-amber-700 transition-colors"
          >
            Wrap Up
          </button>
        )}
      </div>
    </div>
  );
}
