'use client';

import type { TranscriptEntry, RoundType, Panelist } from '@/engine/types';

interface Props {
  transcript: TranscriptEntry[];
  panelists: Panelist[];
}

const ROUND_LABELS: Record<RoundType, string> = {
  'initial-takes': 'INITIAL TAKES',
  'cross-talk': 'CROSS-TALK',
  'moderation': 'Q&A',
  'wrap-up': 'WRAP-UP',
  'summary': 'SUMMARY',
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
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }}>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Field log is empty.</p>
      </div>
    );
  }

  return (
    <div
      className="specimen-card"
      style={{ ['--brass-accent' as string]: 'var(--accent-gold)' }}
    >
      <div className="brass-plate">
        <div className="brass-screw" />
        <span className="brass-label">FIELD LOG · FULL TRANSCRIPT</span>
        <span className="brass-marker-sm">
          {transcript.length} ENTRIES
        </span>
        <div className="brass-screw" />
      </div>

      {/* Transcript body */}
      <div className="py-2">
        {rounds.map((roundGroup, ri) => (
          <div key={ri}>
            {/* Round divider — broadcast segment marker */}
            {ri > 0 && (
              <div className="transcript-round-divider">
                <span className="transcript-round-label">
                  <span className="dot" />
                  {ROUND_LABELS[roundGroup.round] || roundGroup.round}
                </span>
              </div>
            )}
            {ri === 0 && (
              <div className="transcript-round-divider" style={{ paddingTop: '4px' }}>
                <span className="transcript-round-label">
                  <span className="dot" />
                  {ROUND_LABELS[roundGroup.round] || roundGroup.round}
                </span>
              </div>
            )}

            {/* Entries */}
            {roundGroup.entries.map((entry) => {
              const color = colorMap.get(entry.panelistId) || '#6b7280';
              const isModerator = entry.panelistId === 'user';

              return (
                <div
                  key={entry.id}
                  className="transcript-entry"
                  style={{
                    borderLeftColor: isModerator ? 'var(--accent-gold)' : color,
                    background: isModerator ? 'rgba(196, 154, 42, 0.04)' : undefined,
                  }}
                >
                  {/* Timestamp column */}
                  <span className="transcript-timestamp">
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className="transcript-speaker"
                        style={{ color: isModerator ? 'var(--accent-gold)' : color }}
                      >
                        {entry.panelistName.toUpperCase()}
                      </span>
                      {isModerator && (
                        <span
                          className="px-1.5 py-px rounded"
                          style={{
                            background: 'rgba(196, 154, 42, 0.1)',
                            border: '1px solid rgba(196, 154, 42, 0.15)',
                            fontFamily: "'DM Mono', monospace",
                            fontSize: '7px',
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            color: 'var(--accent-gold)',
                          }}
                        >
                          MOD
                        </span>
                      )}
                    </div>
                    <p className={`transcript-text ${isModerator ? 'moderator' : ''}`}>
                      {entry.content}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
