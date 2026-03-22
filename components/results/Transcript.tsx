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

const ROUND_ICONS: Record<RoundType, React.ReactNode> = {
  'initial-takes': (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  'cross-talk': (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  'moderation': (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  'wrap-up': (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  'summary': (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" />
    </svg>
  ),
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
      <div className="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No transcript available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {rounds.map((roundGroup, ri) => (
        <div key={ri}>
          <div
            className="flex items-center gap-2 pb-2 mb-4"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <span style={{ color: 'var(--accent-gold)' }}>
              {ROUND_ICONS[roundGroup.round]}
            </span>
            <h3
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              {ROUND_LABELS[roundGroup.round] || roundGroup.round}
            </h3>
            <span
              className="label-mono text-[10px] ml-auto"
              style={{ color: 'var(--text-muted)' }}
            >
              {roundGroup.entries.length} message{roundGroup.entries.length !== 1 ? 's' : ''}
            </span>
          </div>
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
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
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
