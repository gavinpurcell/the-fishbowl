'use client';

import type { Panelist } from '@/engine/types';

interface Props {
  panelist: Panelist | null;
  text: string;
  isStreaming: boolean;
}

export default function SpeakerCard({ panelist, text, isStreaming }: Props) {
  if (!panelist || !text) return null;

  return (
    <div className="max-w-[800px] mx-auto mt-4 animate-fade-in">
      <div
        className="rounded-xl p-5"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderLeft: `3px solid ${panelist.color}`,
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-700"
            style={{
              backgroundColor: panelist.color + '20',
              color: panelist.color,
              border: `2px solid ${panelist.color}`,
            }}
          >
            {panelist.name.charAt(0)}
          </div>
          <div>
            <div className="font-600 text-sm" style={{ color: 'var(--text-primary)' }}>{panelist.name}</div>
            <div className="label-mono" style={{ fontSize: '9px' }}>{panelist.role}</div>
          </div>
          {isStreaming && (
            <span className="ml-auto pulse-ring w-2 h-2 rounded-full" style={{ background: panelist.color }} />
          )}
        </div>
        <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
          {text}
          {isStreaming && <span className="inline-block w-1 h-3.5 ml-0.5 animate-pulse" style={{ background: panelist.color }} />}
        </p>
      </div>
    </div>
  );
}
