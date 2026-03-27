'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFishbowlStore } from '@/lib/store';
import { exportSession } from '@/lib/session';
import Summary from '@/components/results/Summary';
import Transcript from '@/components/results/Transcript';
import ExportPanel from '@/components/results/ExportPanel';
import CostTally from '@/components/results/CostTally';
import LeadCapturePopup from '@/components/results/LeadCapturePopup';

export default function ResultsPage() {
  const router = useRouter();
  const store = useFishbowlStore();
  const [exportMode, setExportMode] = useState<'summary' | 'transcript'>('summary');
  const [jsonSaved, setJsonSaved] = useState(false);
  const [viewTransition, setViewTransition] = useState(false);
  const [showLeadPopup, setShowLeadPopup] = useState(true);

  // Redirect if no completed session
  useEffect(() => {
    if (store.status !== 'completed' || store.transcript.length === 0) {
      router.replace('/setup');
    }
  }, [store.status, store.transcript.length, router]);

  const handleNewSession = () => {
    store.resetSession();
    router.push('/setup');
  };

  const handleSaveJson = useCallback(() => {
    exportSession(store.getSessionConfig(), store.transcript, store.summary);
    setJsonSaved(true);
    setTimeout(() => setJsonSaved(false), 2000);
  }, [store]);


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
        <div className="text-center report-enter">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4" style={{ color: 'var(--accent-gold)', opacity: 0.5 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
          </svg>
          <h2 className="font-pixel text-lg title-text mb-2">
            NO REPORT
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
            Complete a session to generate a debrief report.
          </p>
          <button
            onClick={() => router.push('/setup')}
            className="results-cta"
          >
            Start a Session
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
  const sessionDate = store.sessionEndTime
    ? new Date(store.sessionEndTime).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
  const sessionTime = store.sessionEndTime
    ? new Date(store.sessionEndTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-deep)' }}>
      {/* Lead capture — full modal first time, slim banner after */}
      {showLeadPopup && (
        <LeadCapturePopup onDismiss={() => setShowLeadPopup(false)} />
      )}
      {!showLeadPopup && (
        <div
          style={{
            background: 'var(--bg-surface)',
            borderBottom: '1px solid var(--border)',
            padding: '10px 16px',
            textAlign: 'center',
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '12px',
              color: 'var(--text-muted)',
            }}
          >
            I build AI experiences like this.{' '}
            <a
              href="mailto:gavin@gavinpurcell.com"
              style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}
            >
              Let&apos;s talk
            </a>
            {' '}&middot;{' '}
            <a
              href="/about"
              style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
            >
              Why I made this
            </a>
          </span>
        </div>
      )}

      {/* Ambient glow */}
      <div
        className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-[0.06] rounded-full blur-[120px] pointer-events-none"
        style={{ background: 'var(--accent-gold)' }}
      />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* === REPORT HEADER — Classified document dossier === */}
        <div className="report-header report-enter report-enter-1 mb-6">
          {/* Top bar with stamp and date */}
          <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3">
            <div className="report-stamp">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: '#4ade80',
                  boxShadow: '0 0 6px rgba(74, 222, 128, 0.5)',
                }}
              />
              SESSION COMPLETE
            </div>
            <span className="report-field-value" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
              {sessionDate} {sessionTime && `// ${sessionTime}`}
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '0 16px' }} />

          {/* Title */}
          <div className="px-4 sm:px-5 pt-4 pb-3">
            <h1
              className="font-pixel title-text"
              style={{ fontSize: 'clamp(1.25rem, 4vw, 1.75rem)' }}
            >
              SESSION DEBRIEF
            </h1>
          </div>

          {/* Metadata fields row */}
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 px-4 sm:px-5 pb-4">
            <div className="report-field">
              <span className="report-field-label">Panelists</span>
              <span className="report-field-value">{panelistCount}</span>
            </div>
            <div className="report-field-divider" />
            {duration !== null && (
              <>
                <div className="report-field">
                  <span className="report-field-label">Duration</span>
                  <span className="report-field-value">{duration} min</span>
                </div>
                <div className="report-field-divider" />
              </>
            )}
            {questionCount > 0 && (
              <>
                <div className="report-field">
                  <span className="report-field-label">Questions</span>
                  <span className="report-field-value">{questionCount}</span>
                </div>
                <div className="report-field-divider" />
              </>
            )}
            <div className="report-field">
              <span className="report-field-label">Entries</span>
              <span className="report-field-value">{store.transcript.length}</span>
            </div>
          </div>

          {/* Panelist color dots */}
          <div className="flex items-center gap-1.5 px-4 sm:px-5 pb-4">
            {store.panelists.map((p) => (
              <div
                key={p.id}
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: p.color,
                  opacity: 0.7,
                }}
                title={p.name}
              />
            ))}
          </div>
        </div>

        {/* === EXPORT PANEL — Document tabs + action badges === */}
        <div className="report-enter report-enter-2 mb-6">
          <ExportPanel
            transcript={store.transcript}
            summary={store.summary}
            mode={exportMode}
            onModeChange={handleModeChange}
            ideaText={store.ideaText}
          />
        </div>

        {/* === DOCUMENT BODY — Summary or Transcript === */}
        <div className="report-enter report-enter-3 mb-6">
          {exportMode === 'summary' ? (
            <div className="report-document">
              <div className="report-doc-header">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-gold)' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M16 13H8" />
                  <path d="M16 17H8" />
                  <path d="M10 9H8" />
                </svg>
                <span
                  style={{
                    fontFamily: "'Silkscreen', monospace",
                    fontSize: '9px',
                    letterSpacing: '0.1em',
                    color: 'var(--text-muted)',
                  }}
                >
                  EXECUTIVE SUMMARY
                </span>
              </div>
              <div
                className="p-5 sm:p-6 transition-opacity duration-150 ease-in-out"
                style={{ opacity: viewTransition ? 0 : 1 }}
              >
                {store.summary ? (
                  <Summary summary={store.summary} />
                ) : (
                  <Summary summary={null} />
                )}
              </div>
            </div>
          ) : (
            <div
              className="transition-opacity duration-150 ease-in-out"
              style={{ opacity: viewTransition ? 0 : 1 }}
            >
              <Transcript transcript={store.transcript} panelists={store.panelists} />
            </div>
          )}
        </div>

        {/* === COST TALLY — Compact budget line strip === */}
        <div className="report-enter report-enter-4 mb-6">
          <CostTally />
        </div>

        {/* === SAVE JSON ROW === */}
        <div className="report-enter report-enter-4 mb-6">
          <div
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 rounded-lg"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
            }}
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div>
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Archive Session
                </span>
                <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                  Full JSON export
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleSaveJson}
                className={`action-badge ${jsonSaved ? 'success' : ''}`}
              >
                {jsonSaved ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                    Saved
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    JSON
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* === DIVIDER === */}
        <div
          className="report-enter report-enter-5 mb-8"
          style={{
            height: '1px',
            background: 'linear-gradient(90deg, transparent, var(--border), transparent)',
          }}
        />

        {/* === NEW SESSION CTA === */}
        <div className="flex flex-col items-center report-enter report-enter-6">
          <button
            onClick={handleNewSession}
            className="results-cta flex items-center gap-3"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
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
            New Session
          </button>
          <p
            className="label-mono mt-4 text-[10px] tracking-widest"
            style={{ color: 'var(--text-muted)' }}
          >
            Session data will be cleared
          </p>
        </div>
      </div>
    </div>
  );
}
