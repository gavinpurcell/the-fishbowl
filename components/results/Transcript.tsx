'use client';

import type { TranscriptEntry, RoundType, Panelist } from '@/engine/types';

interface Props {
  transcript: TranscriptEntry[];
  panelists: Panelist[];
}

const ROUND_LABELS: Record<RoundType, string> = {
  'initial-takes': 'Round 1: Initial Takes',
  'cross-talk': 'Round 2: Cross-Talk',
  'moderation': 'Round 3: Moderation',
  'wrap-up': 'Final Takeaways',
  'summary': 'Summary',
};

export default function Transcript({ transcript, panelists }: Props) {
  // Build a color map from panelists
  const colorMap = new Map<string, string>();
  panelists.forEach((p) => {
    colorMap.set(p.id, p.color);
  });

  // Group entries by round
  const rounds: { round: RoundType; entries: TranscriptEntry[] }[] = [];
  let currentRound: RoundType | null = null;

  for (const entry of transcript) {
    if (entry.round !== currentRound) {
      currentRound = entry.round;
      rounds.push({ round: currentRound, entries: [] });
    }
    rounds[rounds.length - 1].entries.push(entry);
  }

  if (transcript.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8">
        No transcript available.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {rounds.map((roundGroup, ri) => (
        <div key={ri}>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 border-b pb-2">
            {ROUND_LABELS[roundGroup.round] || roundGroup.round}
          </h3>
          <div className="space-y-4">
            {roundGroup.entries.map((entry) => {
              const color = colorMap.get(entry.panelistId) || '#6b7280';
              const isModerator = entry.panelistId === 'user';

              return (
                <div key={entry.id} className="flex gap-3">
                  <div
                    className="w-1 rounded-full shrink-0"
                    style={{ backgroundColor: isModerator ? '#3b82f6' : color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: isModerator ? '#3b82f6' : color }}
                      >
                        {entry.panelistName}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
