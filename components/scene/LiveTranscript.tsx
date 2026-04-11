'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

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
  'initial-takes': 'INITIAL TAKES',
  'cross-talk': 'CROSS-TALK',
  'moderation': 'Q&A',
  'wrap-up': 'WRAP-UP',
  'summary': 'SUMMARY',
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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);
  const prevEntryCountRef = useRef(0);
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(new Set());

  // Build a quick lookup for panelist info
  const panelistMap = useMemo(() => {
    const map = new Map<string, PanelistInfo>();
    panelists.forEach((p) => map.set(p.id, p));
    return map;
  }, [panelists]);

  // Track which entries are "new" for fade-in animation
  useEffect(() => {
    if (entries.length > prevEntryCountRef.current) {
      const newIds = new Set(animatedIds);
      for (let i = prevEntryCountRef.current; i < entries.length; i++) {
        newIds.add(entries[i].id);
      }
      // eslint-disable-next-line react-hooks/set-state-in-effect -- tracks new entries for fade-in animation
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
  const lastEntryContentLength = entries[entries.length - 1]?.content.length ?? 0;
  useEffect(() => {
    if (autoScroll && bottomSentinelRef.current && !isCollapsed) {
      bottomSentinelRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries.length, lastEntryContentLength, autoScroll, isCollapsed]);

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
    <div className="max-w-[800px] mx-auto mt-6" role="log" aria-live="polite" aria-label="Live transcript">
      {/* Header bar — broadcast feed style */}
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{
          background: 'var(--dark-surface)',
          border: '1px solid var(--dark-border)',
          borderBottom: isCollapsed ? '1px solid var(--dark-border)' : 'none',
          borderRadius: isCollapsed ? '10px' : '10px 10px 0 0',
        }}
      >
        <div className="flex items-center gap-2.5">
          {/* Feed icon */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-gold)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.7 }}
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '9px',
              letterSpacing: '0.1em',
              color: 'var(--accent-gold)',
            }}
          >
            TRANSCRIPT FEED
          </span>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '10px',
              color: 'rgba(255,255,255,0.25)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {entries.length}
          </span>
          {isSpeaking && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: 'var(--accent-red)',
                boxShadow: '0 0 4px rgba(232, 90, 74, 0.5)',
                animation: 'statusPulse 1.5s ease-in-out infinite',
              }}
            />
          )}
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? 'Expand transcript' : 'Collapse transcript'}
          aria-expanded={!isCollapsed}
          className="flex items-center gap-1.5 px-2 py-1 rounded transition-colors"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: "'DM Mono', monospace",
            fontSize: '10px',
            color: 'rgba(255,255,255,0.3)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)';
          }}
        >
          <svg
            width="10"
            height="10"
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
          {isCollapsed ? 'EXPAND' : 'COLLAPSE'}
        </button>
      </div>

      {/* Collapsed preview — show last entry only */}
      {isCollapsed && lastEntry && (
        <div
          className="px-4 py-3 rounded-b-lg mt-px"
          style={{
            background: 'rgba(26, 23, 20, 0.7)',
            border: '1px solid var(--dark-border)',
            borderTop: 'none',
          }}
        >
          <EntryRow
            entry={lastEntry}
            panelist={panelistMap.get(lastEntry.panelistId) || null}
            isActive={isSpeaking && activePanelistId === lastEntry.panelistId}
            isSpeaking={isSpeaking}
            isAnimating={false}
          />
        </div>
      )}

      {/* Expanded transcript — teleprompter feed */}
      {!isCollapsed && (
        <div
          className="relative"
          style={{
            borderRadius: '0 0 10px 10px',
            overflow: 'hidden',
          }}
        >
          {/* Top scroll fade */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '24px',
              background: 'linear-gradient(to bottom, rgba(26,23,20,0.95), transparent)',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />

          {/* Bottom scroll fade */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '24px',
              background: 'linear-gradient(to top, rgba(26,23,20,0.95), transparent)',
              zIndex: 2,
              pointerEvents: 'none',
            }}
          />

          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="overflow-y-auto"
            style={{
              background: 'rgba(26, 23, 20, 0.85)',
              border: '1px solid var(--dark-border)',
              borderTop: 'none',
              maxHeight: '25vh',
              borderRadius: '0 0 10px 10px',
            }}
          >
            <div className="py-4 px-3 space-y-0.5">
              {entries.map((entry, index) => {
                const prevEntry = index > 0 ? entries[index - 1] : null;
                const showRoundDivider = prevEntry && prevEntry.round !== entry.round;
                const panelist = panelistMap.get(entry.panelistId) || null;
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
            className="px-3 py-1 rounded-b-lg transition-colors"
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--dark-surface)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: "'Silkscreen', monospace",
              fontSize: '8px',
              fontWeight: 400,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            SCROLL TO LATEST
          </button>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Round Divider — broadcast-style segment marker                     */
/* ------------------------------------------------------------------ */

function RoundDivider({ round }: { round: string }) {
  const label = ROUND_LABELS[round] || round;

  return (
    <div className="flex items-center gap-3 py-3 my-1">
      <div
        className="flex-1 h-px"
        style={{ background: 'rgba(196, 154, 42, 0.15)' }}
      />
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded"
        style={{
          background: 'rgba(196, 154, 42, 0.08)',
          border: '1px solid rgba(196, 154, 42, 0.15)',
        }}
      >
        <span
          className="w-1 h-1 rounded-full"
          style={{ background: 'var(--accent-gold)', opacity: 0.6 }}
        />
        <span
          style={{
            fontFamily: "'Silkscreen', monospace",
            fontSize: '8px',
            letterSpacing: '0.1em',
            color: 'var(--accent-gold)',
          }}
        >
          {label}
        </span>
      </div>
      <div
        className="flex-1 h-px"
        style={{ background: 'rgba(196, 154, 42, 0.15)' }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Entry Row — court reporter style                                   */
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
  const color = panelist?.color || (isModerator ? 'var(--accent-gold)' : 'rgba(255,255,255,0.4)');

  return (
    <div
      className="flex gap-3 rounded-lg px-3 py-2.5 transition-all"
      style={{
        borderLeft: isActive
          ? `3px solid ${color}`
          : '3px solid transparent',
        background: isModerator
          ? 'rgba(196, 154, 42, 0.04)'
          : isActive
            ? `rgba(255,255,255,0.02)`
            : 'transparent',
        boxShadow: isActive
          ? `inset 3px 0 12px -4px ${typeof color === 'string' && color.startsWith('#') ? color + '30' : 'rgba(196,154,42,0.15)'}`
          : 'none',
        animation: isAnimating
          ? 'transcriptFadeIn 0.4s ease-out forwards'
          : isActive
            ? 'transcriptPulse 2s ease-in-out infinite'
            : 'none',
      }}
    >
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {/* Speaker name in Silkscreen with their color */}
          <span
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '9px',
              letterSpacing: '0.04em',
              color: color,
            }}
          >
            {entry.panelistName.toUpperCase()}
          </span>
          {isModerator && (
            <span
              className="px-1.5 py-px rounded"
              style={{
                background: 'rgba(196, 154, 42, 0.1)',
                border: '1px solid rgba(196, 154, 42, 0.15)',
                fontFamily: "'Silkscreen', monospace",
                fontSize: '7px',
                letterSpacing: '0.06em',
                color: 'var(--accent-gold)',
              }}
            >
              MOD
            </span>
          )}
          {isActive && (
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: color,
                boxShadow: `0 0 4px ${typeof color === 'string' && color.startsWith('#') ? color + '80' : 'rgba(196,154,42,0.5)'}`,
                animation: 'statusPulse 1.5s ease-in-out infinite',
              }}
            />
          )}
          {/* Timestamp */}
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '9px',
              color: 'rgba(255,255,255,0.15)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p
          className="whitespace-pre-wrap"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '12px',
            lineHeight: '1.65',
            color: isModerator
              ? 'rgba(255,255,255,0.8)'
              : 'rgba(255,255,255,0.55)',
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
