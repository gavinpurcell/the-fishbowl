'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFishbowlStore } from '@/lib/store';
import { exportSession } from '@/lib/session';
import Summary from '@/components/results/Summary';
import Transcript from '@/components/results/Transcript';
import ExportPanel from '@/components/results/ExportPanel';
import CostTally from '@/components/results/CostTally';

export default function ResultsPage() {
  const router = useRouter();
  const store = useFishbowlStore();
  const [exportMode, setExportMode] = useState<'summary' | 'transcript'>('summary');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // Redirect if no completed session
  useEffect(() => {
    if (store.status !== 'completed' || store.transcript.length === 0) {
      router.replace('/setup');
    }
  }, [store.status, store.transcript.length, router]);

  // Check for video in sessionStorage
  useEffect(() => {
    const url = sessionStorage.getItem('fishbowl-video-url');
    setVideoUrl(url);
  }, []);

  const handleNewSession = () => {
    store.resetSession();
    router.push('/setup');
  };

  const handleSaveJson = () => {
    exportSession(store.getSessionConfig(), store.transcript, store.summary);
  };

  const handleDownloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = 'fishbowl-session.mp4';
    a.click();
  };

  if (store.status !== 'completed' || store.transcript.length === 0) {
    return null;
  }

  // Session stats
  const duration =
    store.sessionStartTime && store.sessionEndTime
      ? Math.round((store.sessionEndTime - store.sessionStartTime) / 60000)
      : null;
  const questionCount = store.moderationQuestionCount;
  const panelistCount = store.panelists.length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-deep)' }}>
      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-[0.08] rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'var(--accent-gold)' }}
      />

      <div className="max-w-3xl mx-auto px-6 py-12 animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <div
            className="label-mono text-[10px] mb-2 tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            SESSION COMPLETE
          </div>
          <h1
            className="text-3xl font-bold tracking-tight mb-3"
            style={{ color: 'var(--text-primary)' }}
          >
            Your Fishbowl Results
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {panelistCount} panelist{panelistCount !== 1 ? 's' : ''}
            {duration !== null && <> &middot; {duration} min</>}
            {questionCount > 0 && (
              <> &middot; {questionCount} question{questionCount !== 1 ? 's' : ''}</>
            )}
          </p>
        </div>

        {/* ExportPanel */}
        <div className="mb-6">
          <ExportPanel
            transcript={store.transcript}
            summary={store.summary}
            mode={exportMode}
            onModeChange={setExportMode}
          />
        </div>

        {/* Preview area */}
        <div
          className="rounded-xl p-6 mb-6"
          style={{ background: '#ffffff' }}
        >
          {exportMode === 'summary' && store.summary ? (
            <Summary summary={store.summary} />
          ) : (
            <Transcript transcript={store.transcript} panelists={store.panelists} />
          )}
        </div>

        {/* CostTally */}
        <div className="mb-6">
          <CostTally />
        </div>

        {/* Save JSON row */}
        <div
          className="rounded-xl p-5 mb-6 flex items-center justify-between gap-4"
          style={{ background: 'var(--bg-surface)' }}
        >
          <div>
            <div
              className="text-sm font-semibold mb-0.5"
              style={{ color: 'var(--text-primary)' }}
            >
              Save Session Data
            </div>
            <div
              className="text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              Export the full session as JSON for later use
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              onClick={handleSaveJson}
              className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:brightness-110"
              style={{
                background: 'var(--bg-deep)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
              }}
            >
              Save JSON
            </button>
            {videoUrl && (
              <button
                onClick={handleDownloadVideo}
                className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:brightness-110"
                style={{
                  background: 'var(--accent-warm)',
                  color: '#ffffff',
                }}
              >
                Download Video
              </button>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="mb-8" style={{ borderTop: '2px solid var(--border)' }} />

        {/* New Fishbowl CTA */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleNewSession}
            className="px-12 py-4 rounded-xl text-lg font-semibold cursor-pointer transition-all duration-200 hover:brightness-110 flex items-center gap-2"
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--bg-deep)',
              boxShadow: '0 4px 16px rgba(196, 154, 42, 0.3)',
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Start a New Fishbowl!
          </button>
          <p
            className="label-mono mt-4 text-[11px] tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            All session data will be cleared
          </p>
        </div>
      </div>
    </div>
  );
}
