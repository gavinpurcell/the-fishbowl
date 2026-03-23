'use client';

import { useState, useEffect, useRef } from 'react';
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
  'initial-takes': 'ROUND 1 — INITIAL TAKES',
  'cross-talk': 'ROUND 2 — CROSS-TALK',
  'moderation': 'ROUND 3 — Q&A',
  'wrap-up': 'FINAL TAKEAWAYS',
  'summary': 'GENERATING SUMMARY...',
};

export default function StatusBar({ round, panelistsSpoken, totalPanelists, onWrapUp, canWrapUp, modelLabel, costDollars, totalTokens, isOllama }: Props) {
  // Timer: counts up from session start
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const isActive = round !== 'summary' && round !== 'wrap-up';

  return (
    <div
      className="max-w-[1000px] mx-auto rounded-b-xl overflow-hidden"
      style={{
        background: 'var(--dark-surface)',
        borderTop: '2px solid var(--dark-border)',
      }}
    >
      {/* Thin gold accent line at top */}
      <div
        style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(196, 154, 42, 0.5), transparent)',
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-4 py-2">
        {/* Left: Round indicator + timer */}
        <div className="flex items-center gap-3">
          {/* Live/recording indicator */}
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: isActive ? 'var(--accent-red)' : '#666',
                boxShadow: isActive ? '0 0 6px rgba(232, 90, 74, 0.6)' : 'none',
                animation: isActive ? 'statusPulse 2s ease-in-out infinite' : 'none',
              }}
            />
            <span
              style={{
                fontFamily: "'Silkscreen', monospace",
                fontSize: '9px',
                letterSpacing: '0.08em',
                color: isActive ? 'var(--accent-red)' : '#666',
              }}
            >
              {isActive ? 'REC' : 'END'}
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', height: '16px', background: 'var(--dark-divider)' }} />

          {/* Round label */}
          <span
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '9px',
              letterSpacing: '0.06em',
              color: 'var(--accent-gold)',
            }}
          >
            {ROUND_LABELS[round]}
          </span>
        </div>

        {/* Right: Stats + wrap up */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Timer */}
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(196,154,42,0.7)" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '11px',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.7)',
                fontVariantNumeric: 'tabular-nums',
                animation: isActive ? 'timerPulse 2s ease-in-out infinite' : 'none',
              }}
            >
              {timeStr}
            </span>
          </div>

          {/* Model badge */}
          {modelLabel && (
            <span
              className="hidden sm:inline-flex items-center px-2 py-0.5 rounded"
              style={{
                background: 'rgba(196, 154, 42, 0.12)',
                border: '1px solid rgba(196, 154, 42, 0.2)',
                fontFamily: "'DM Mono', monospace",
                fontSize: '9px',
                fontWeight: 500,
                letterSpacing: '0.04em',
                color: 'rgba(196, 154, 42, 0.8)',
                textTransform: 'uppercase',
              }}
            >
              {modelLabel}
            </span>
          )}

          {/* Token/cost counter */}
          {totalTokens != null && totalTokens > 0 && (
            <span
              className="hidden sm:inline"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '10px',
                color: 'rgba(255,255,255,0.4)',
              }}
            >
              {isOllama ? 'FREE' : `${formatCost(costDollars || 0)} / ${formatTokens(totalTokens)} tk`}
            </span>
          )}

          {/* Panelist count */}
          <span
            className="hidden sm:inline"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '10px',
              color: 'rgba(255,255,255,0.4)',
            }}
          >
            {panelistsSpoken}/{totalPanelists}
          </span>

          {/* Wrap Up button — broadcast END SHOW style (gold during moderation) */}
          {canWrapUp && (
            <button
              onClick={onWrapUp}
              className="status-bar-wrap-btn"
              style={{
                fontFamily: "'Silkscreen', monospace",
                fontSize: round === 'moderation' ? '11px' : '9px',
                letterSpacing: '0.08em',
                padding: round === 'moderation' ? '8px 16px' : '6px 12px',
                borderRadius: '6px',
                border: round === 'moderation'
                  ? '2px solid var(--accent-gold)'
                  : '1px solid rgba(232, 90, 74, 0.4)',
                cursor: 'pointer',
                background: round === 'moderation'
                  ? 'linear-gradient(180deg, rgba(196, 154, 42, 0.25) 0%, rgba(196, 154, 42, 0.12) 100%)'
                  : 'rgba(232, 90, 74, 0.12)',
                color: round === 'moderation'
                  ? 'var(--accent-gold-light)'
                  : 'var(--accent-red)',
                transition: 'all 0.15s ease',
                textTransform: 'uppercase',
                animation: round === 'moderation' ? 'wrapGoldPulseSubtle 3s ease-in-out infinite' : 'none',
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                if (round === 'moderation') {
                  el.style.background = 'linear-gradient(180deg, rgba(196, 154, 42, 0.4) 0%, rgba(196, 154, 42, 0.2) 100%)';
                  el.style.boxShadow = '0 0 20px rgba(196, 154, 42, 0.4), 0 0 40px rgba(196, 154, 42, 0.15)';
                } else {
                  el.style.background = 'rgba(232, 90, 74, 0.25)';
                  el.style.borderColor = 'rgba(232, 90, 74, 0.6)';
                  el.style.boxShadow = '0 0 12px rgba(232, 90, 74, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                if (round === 'moderation') {
                  el.style.background = 'linear-gradient(180deg, rgba(196, 154, 42, 0.25) 0%, rgba(196, 154, 42, 0.12) 100%)';
                  el.style.boxShadow = '';
                } else {
                  el.style.background = 'rgba(232, 90, 74, 0.12)';
                  el.style.borderColor = 'rgba(232, 90, 74, 0.4)';
                  el.style.boxShadow = 'none';
                }
              }}
            >
              <span className="hidden sm:inline">{round === 'moderation' ? 'END SHOW' : 'WRAP SESSION'}</span>
              <span className="sm:hidden">{round === 'moderation' ? 'END' : 'WRAP'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
