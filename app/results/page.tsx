'use client';

import { useEffect, useState, useCallback } from 'react';
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
  const [jsonSaved, setJsonSaved] = useState(false);
  const [viewTransition, setViewTransition] = useState(false);

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

  const handleSaveJson = useCallback(() => {
    exportSession(store.getSessionConfig(), store.transcript, store.summary);
    setJsonSaved(true);
    setTimeout(() => setJsonSaved(false), 2000);
  }, [store]);

  const handleDownloadVideo = () => {
    if (!videoUrl) return;
    const a = document.createElement('a');
    a.href = videoUrl;
    a.download = 'fishbowl-session.mp4';
    a.click();
  };

  // Smooth mode toggle with crossfade
  const handleModeChange = useCallback((mode: 'summary' | 'transcript') => {
    if (mode === exportMode) return;
    setViewTransition(true);
    setTimeout(() => {
      setExportMode(mode);
      setTimeout(() => setViewTransition(false), 30);
    }, 150);
  }, [exportMode]);

  if (store.status !== 'completed' || store.transcript.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-deep)' }}>
        <div className="text-center animate-fade-in">
          <div className="text-4xl mb-4" style={{ color: 'var(--text-muted)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4" style={{ color: 'var(--accent-gold)' }}>
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No Session Results
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Complete a focus group session to see results here.
          </p>
          <button
            onClick={() => router.push('/setup')}
            className="px-8 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all duration-200 hover:brightness-110 cta-glow"
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--bg-deep)',
            }}
          >
            Start a New Fishbowl
          </button>
        </div>
      </div>
    );
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

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8 animate-fade-in">
          <div
            className="label-mono text-[10px] mb-2 tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            SESSION COMPLETE
          </div>
          <h1
            className="font-pixel text-xl sm:text-2xl title-text mb-3"
          >
            YOUR RESULTS
          </h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="inline-flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-gold)' }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              {panelistCount} panelist{panelistCount !== 1 ? 's' : ''}
            </span>
            {duration !== null && (
              <span className="inline-flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-gold)' }}>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                {duration} min
              </span>
            )}
            {questionCount > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-gold)' }}>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                {questionCount} question{questionCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* ExportPanel */}
        <div className="mb-6 animate-fade-in animate-fade-in-delay-1">
          <ExportPanel
            transcript={store.transcript}
            summary={store.summary}
            mode={exportMode}
            onModeChange={handleModeChange}
          />
        </div>

        {/* Preview area */}
        <div
          className="rounded-xl mb-6 overflow-hidden animate-fade-in animate-fade-in-delay-2"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          {/* Section label inside the card */}
          <div
            className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--border)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-gold)' }}>
              {exportMode === 'summary' ? (
                <>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                  <path d="M10 9H8" />
                </>
              ) : (
                <>
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </>
              )}
            </svg>
            <span className="label-mono text-[10px] tracking-widest" style={{ color: 'var(--text-muted)' }}>
              {exportMode === 'summary' ? 'AI SUMMARY' : 'FULL TRANSCRIPT'}
            </span>
          </div>
          <div
            className="p-4 sm:p-6 transition-opacity duration-150 ease-in-out"
            style={{ opacity: viewTransition ? 0 : 1 }}
          >
            {exportMode === 'summary' && store.summary ? (
              <Summary summary={store.summary} />
            ) : (
              <Transcript transcript={store.transcript} panelists={store.panelists} />
            )}
          </div>
        </div>

        {/* CostTally */}
        <div className="mb-6 animate-fade-in animate-fade-in-delay-3">
          <CostTally />
        </div>

        {/* Save JSON row */}
        <div
          className="rounded-xl p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in animate-fade-in-delay-3"
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
              className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all hover:brightness-110 inline-flex items-center gap-2"
              style={{
                background: 'var(--bg-deep)',
                color: jsonSaved ? 'var(--accent-gold)' : 'var(--text-primary)',
                border: `1px solid ${jsonSaved ? 'var(--accent-gold)' : 'var(--border)'}`,
              }}
            >
              {jsonSaved ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Saved!
                </>
              ) : (
                'Save JSON'
              )}
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
        <div className="mb-8 animate-fade-in animate-fade-in-delay-4" style={{ borderTop: '2px solid var(--border)' }} />

        {/* New Fishbowl CTA */}
        <div className="flex flex-col items-center animate-fade-in animate-fade-in-delay-4">
          <button
            onClick={handleNewSession}
            className="px-8 sm:px-12 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg font-semibold cursor-pointer transition-all duration-200 flex items-center gap-2 cta-glow"
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--bg-deep)',
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
            Start a New Fishbowl
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
