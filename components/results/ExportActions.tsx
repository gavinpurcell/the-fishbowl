'use client';

import { useRef } from 'react';
import type { TranscriptEntry, SessionConfig } from '@/engine/types';
import { exportSession, importSession, exportAsMarkdown } from '@/lib/session';

interface Props {
  transcript: TranscriptEntry[];
  summary: string | null;
  sessionConfig: SessionConfig;
  onContinueSession: () => void;
  onNewSession: () => void;
  onImportSession: (transcript: TranscriptEntry[], summary: string | null, config: SessionConfig) => void;
}

export default function ExportActions({
  transcript,
  summary,
  sessionConfig,
  onContinueSession,
  onNewSession,
  onImportSession,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyMarkdown = async () => {
    const markdown = exportAsMarkdown(transcript, summary);
    try {
      await navigator.clipboard.writeText(markdown);
      alert('Transcript copied to clipboard as Markdown.');
    } catch {
      // Fallback: create a download
      const blob = new Blob([markdown], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fishbowl-transcript-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleSaveSession = () => {
    exportSession(sessionConfig, transcript, summary);
  };

  const handleLoadSession = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const session = await importSession(file);
      onImportSession(session.transcript, session.summary, session.config);
    } catch (err) {
      alert(`Failed to load session: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportVideo = () => {
    const videoUrl = sessionStorage.getItem('fishbowl-video-url');
    if (!videoUrl) {
      alert('No video recording available for this session.');
      return;
    }

    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = `fishbowl-session-${new Date().toISOString().slice(0, 10)}.webm`;
    a.click();
  };

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={handleCopyMarkdown}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        Copy as Markdown
      </button>
      <button
        onClick={handleSaveSession}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        Save Session (JSON)
      </button>
      <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors cursor-pointer">
        Load Session
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleLoadSession}
          className="hidden"
        />
      </label>
      <button
        onClick={handleExportVideo}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
      >
        Export Video
      </button>
      <button
        onClick={onContinueSession}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
      >
        Feed New Context
      </button>
      <button
        onClick={onNewSession}
        className="px-4 py-2 bg-gray-800 text-white rounded-lg text-sm font-medium hover:bg-gray-900 transition-colors"
      >
        New Session
      </button>
    </div>
  );
}
