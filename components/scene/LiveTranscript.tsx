'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TranscriptEntry {
  id: string;
  panelistId: string;
  panelistName: string;
  content: string;
  round: string;
  timestamp: number;
}

interface PanelistInfo {
  id: string;
  name: string;
  color: string;
  spriteIndex: number;
}

interface LiveTranscriptProps {
  entries: TranscriptEntry[];
  panelists: PanelistInfo[];
  activePanelistId: string | null;
  isSpeaking: boolean;
}

/* ------------------------------------------------------------------ */
/*  Round labels                                                       */
/* ------------------------------------------------------------------ */

const ROUND_LABELS: Record<string, string> = {
  'initial-takes': 'Initial Takes',
  'cross-talk': 'Cross-Talk',
  'moderation': 'Moderation',
  'wrap-up': 'Wrap-Up',
  'summary': 'Summary',
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function LiveTranscript({
  entries,
  panelists,
  activePanelistId,
  isSpeaking,
}: LiveTranscriptProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomSentinelRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevEntryCountRef = useRef(0);
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set());

  // Build a quick lookup for panelist info
  const panelistMap = useRef<Map<string, PanelistInfo>>(new Map());
  useEffect(() => {
    const map = new Map<string, PanelistInfo>();
    panelists.forEach((p) => map.set(p.id, p));
    panelistMap.current = map;
  }, [panelists]);

  // Track which entries are "new" for fade-in animation
  useEffect(() => {
    if (entries.length > prevEntryCountRef.current) {
      const newIds = new Set(animatedIds);
      for (let i = prevEntryCountRef.current; i < entries.length; i++) {
        newIds.add(entries[i].id);
      }
      setAnimatedIds(newIds);

      // Remove from animated set after animation completes
      const timeout = setTimeout(() => {
        setAnimatedIds((prev) => {
          const next = new Set(prev);
          for (let i = prevEntryCountRef.current; i < entries.length; i++) {
            if (entries[i]) next.delete(entries[i].id);
          }
          return next;
        });
      }, 500);

      prevEntryCountRef.current = entries.length;
      return () => clearTimeout(timeout);
    }
    prevEntryCountRef.current = entries.length;
  }, [entries.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoScroll && bottomSentinelRef.current && !isCollapsed) {
      bottomSentinelRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries.length, entries[entries.length - 1]?.content.length, autoScroll, isCollapsed]);

  // Detect manual scroll to disable auto-scroll
  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    setAutoScroll(isAtBottom);
  }, []);

  if (entries.length === 0) return null;

  const lastEntry = entries[entries.length - 1];

  return (
    <div className="max-w-[800px] mx-auto mt-6">
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2 rounded-t-xl"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderBottom: isCollapsed ? '1px solid var(--border)' : 'none',
          borderRadius: isCollapsed ? '12px' : undefined,
        }}
      >
        <div className="flex items-center gap-2">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-muted)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="label-mono">Transcript</span>
          <span
            className="text-xs font-mono"
            style={{ color: 'var(--text-muted)', fontSize: '10px' }}
          >
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-1 px-2 py-1 rounded-md transition-colors"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-muted)',
            fontSize: '11px',
            fontFamily: "'DM Mono', monospace",
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = 'var(--bg-surface)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = 'transparent';
          }}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {isCollapsed ? 'Expand' : 'Collapse'}
        </button>
      </div>

      {/* Collapsed preview — show last entry only */}
      {isCollapsed && lastEntry && (
        <div
          className="px-4 py-3 rounded-b-xl mt-px"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderTop: 'none',
          }}
        >
          <EntryRow
            entry={lastEntry}
            panelist={panelistMap.current.get(lastEntry.panelistId) || null}
            isActive={isSpeaking && activePanelistId === lastEntry.panelistId}
            isSpeaking={isSpeaking}
            isAnimating={false}
          />
        </div>
      )}

      {/* Expanded transcript */}
      {!isCollapsed && (
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="rounded-b-xl overflow-y-auto"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderTop: 'none',
            maxHeight: '320px',
          }}
        >
          <div className="p-4 space-y-1">
            {entries.map((entry, index) => {
              const prevEntry = index > 0 ? entries[index - 1] : null;
              const showRoundDivider = prevEntry && prevEntry.round !== entry.round;
              const panelist = panelistMap.current.get(entry.panelistId) || null;
              const isActive = isSpeaking && activePanelistId === entry.panelistId;
              const isLastByActiveSpeaker =
                isActive && index === entries.length - 1;

              return (
                <div key={entry.id}>
                  {/* Round divider */}
                  {showRoundDivider && (
                    <RoundDivider round={entry.round} />
                  )}

                  {/* Entry */}
                  <EntryRow
                    entry={entry}
                    panelist={panelist}
                    isActive={isLastByActiveSpeaker}
                    isSpeaking={isSpeaking}
                    isAnimating={animatedIds.has(entry.id)}
                  />
                </div>
              );
            })}

            {/* Bottom sentinel for auto-scroll */}
            <div ref={bottomSentinelRef} />
          </div>
        </div>
      )}

      {/* Scroll-to-bottom indicator when user has scrolled up */}
      {!isCollapsed && !autoScroll && (
        <div className="flex justify-center -mt-1">
          <button
            onClick={() => {
              setAutoScroll(true);
              bottomSentinelRef.current?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-3 py-1 rounded-b-lg text-xs transition-colors"
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--bg-deep)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'DM Mono', monospace",
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.05em',
            }}
          >
            Scroll to latest
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Round Divider                                                      */
/* ------------------------------------------------------------------ */

function RoundDivider({ round }: { round: string }) {
  const label = ROUND_LABELS[round] || round;

  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className="flex-1 h-px"
        style={{ background: 'var(--border)' }}
      />
      <span
        className="label-mono"
        style={{
          fontSize: '9px',
          color: 'var(--accent-gold)',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <div
        className="flex-1 h-px"
        style={{ background: 'var(--border)' }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Entry Row                                                          */
/* ------------------------------------------------------------------ */

function EntryRow({
  entry,
  panelist,
  isActive,
  isSpeaking,
  isAnimating,
}: {
  entry: TranscriptEntry;
  panelist: PanelistInfo | null;
  isActive: boolean;
  isSpeaking: boolean;
  isAnimating: boolean;
}) {
  const isModerator = entry.panelistId === 'user';
  const color = panelist?.color || (isModerator ? 'var(--accent-gold)' : 'var(--text-muted)');
  const spriteIndex = panelist?.spriteIndex;

  return (
    <div
      className="flex gap-3 rounded-lg px-3 py-2.5 transition-all"
      style={{
        borderLeft: isActive
          ? `3px solid ${color}`
          : '3px solid transparent',
        background: isModerator
          ? 'rgba(196, 154, 42, 0.06)'
          : isActive
            ? `${typeof color === 'string' && color.startsWith('#') ? color : ''}08`
            : 'transparent',
        animation: isAnimating
          ? 'transcriptFadeIn 0.4s ease-out forwards'
          : isActive
            ? 'transcriptPulse 2s ease-in-out infinite'
            : 'none',
      }}
    >
      {/* Portrait / avatar */}
      <div className="flex-shrink-0 mt-0.5">
        {spriteIndex != null ? (
          <img
            src={`/sprites/characters/char_${spriteIndex}_idle.png`}
            alt={entry.panelistName}
            className="rounded"
            style={{
              width: 24,
              height: 24,
              imageRendering: 'pixelated',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-xs font-700"
            style={{
              backgroundColor: isModerator
                ? 'rgba(196, 154, 42, 0.15)'
                : `${typeof color === 'string' && color.startsWith('#') ? color : '#888'}20`,
              color: color,
              fontSize: '10px',
            }}
          >
            {isModerator ? 'M' : entry.panelistName.charAt(0)}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-xs font-600"
            style={{ color }}
          >
            {entry.panelistName}
          </span>
          {isModerator && (
            <span
              className="text-xs px-1.5 py-px rounded"
              style={{
                background: 'rgba(196, 154, 42, 0.12)',
                color: 'var(--accent-gold)',
                fontSize: '9px',
                fontFamily: "'DM Mono', monospace",
                fontWeight: 500,
                letterSpacing: '0.05em',
              }}
            >
              MOD
            </span>
          )}
          {isActive && (
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: color }}
            />
          )}
        </div>
        <p
          className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{
            color: isModerator
              ? 'var(--text-primary)'
              : 'var(--text-secondary)',
          }}
        >
          {entry.content}
          {isActive && isSpeaking && (
            <span
              className="inline-block w-0.5 h-3.5 ml-0.5 rounded-sm"
              style={{
                background: color,
                animation: 'transcriptCursor 1s steps(2) infinite',
              }}
            />
          )}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Inline keyframes (injected once)                                   */
/* ------------------------------------------------------------------ */

if (typeof document !== 'undefined') {
  const STYLE_ID = 'live-transcript-keyframes';
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      @keyframes transcriptFadeIn {
        from {
          opacity: 0;
          transform: translateY(8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes transcriptPulse {
        0%, 100% {
          border-left-color: inherit;
        }
        50% {
          border-left-color: transparent;
        }
      }

      @keyframes transcriptCursor {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}
