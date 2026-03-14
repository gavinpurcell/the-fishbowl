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
    <div className="max-w-[800px] mx-auto mt-4">
      <div
        className="border-l-4 rounded-r-lg p-4 bg-white shadow-sm"
        style={{ borderLeftColor: panelist.color }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: panelist.color }}
          >
            {panelist.name.charAt(0)}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{panelist.name}</div>
            <div className="text-xs text-gray-500">{panelist.role}</div>
          </div>
          {isStreaming && (
            <span className="ml-auto text-xs text-gray-400 animate-pulse">speaking...</span>
          )}
        </div>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {text}
          {isStreaming && <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 animate-pulse" />}
        </p>
      </div>
    </div>
  );
}
