'use client';

import { useState, useCallback } from 'react';
import type { TranscriptEntry } from '@/engine/types';

interface ExportPanelProps {
  transcript: TranscriptEntry[];
  summary: string | null;
  mode: 'summary' | 'transcript';
  onModeChange: (mode: 'summary' | 'transcript') => void;
}

function transcriptToMarkdown(transcript: TranscriptEntry[]): string {
  if (transcript.length === 0) return '';

  const rounds: Record<string, TranscriptEntry[]> = {};
  for (const entry of transcript) {
    if (!rounds[entry.round]) rounds[entry.round] = [];
    rounds[entry.round].push(entry);
  }

  const roundLabels: Record<string, string> = {
    'initial-takes': 'Initial Takes',
    'cross-talk': 'Cross-Talk',
    'moderation': 'Moderation',
    'wrap-up': 'Wrap-Up',
    'summary': 'Summary',
  };

  const lines: string[] = ['# Fishbowl Transcript', ''];

  for (const [round, entries] of Object.entries(rounds)) {
    lines.push(`## ${roundLabels[round] ?? round}`, '');
    for (const entry of entries) {
      lines.push(`**${entry.panelistName}:** ${entry.content}`, '');
    }
  }

  return lines.join('\n');
}

function summaryToMarkdown(summary: string): string {
  return `# Fishbowl Summary\n\n${summary}\n`;
}

export default function ExportPanel({ transcript, summary, mode, onModeChange }: ExportPanelProps) {
  const [mdFeedback, setMdFeedback] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const getContent = useCallback(() => {
    return mode === 'summary' && summary
      ? summaryToMarkdown(summary)
      : transcriptToMarkdown(transcript);
  }, [mode, summary, transcript]);

  const handleDownloadMarkdown = () => {
    const content = getContent();
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'summary' ? 'fishbowl-summary.md' : 'fishbowl-transcript.md';
    a.click();
    URL.revokeObjectURL(url);
    setMdFeedback(true);
    setTimeout(() => setMdFeedback(false), 2000);
  };

  const handleDownloadPdf = async () => {
    setPdfFeedback(true);
    const content = getContent();

    const html2pdf = (await import('html2pdf.js')).default;

    const tempDiv = document.createElement('div');
    tempDiv.style.cssText =
      'position:absolute;left:-9999px;top:0;font-family:sans-serif;padding:32px;max-width:720px;line-height:1.6;color:#111;';
    tempDiv.innerText = content;
    document.body.appendChild(tempDiv);

    await html2pdf()
      .set({
        margin: 16,
        filename: mode === 'summary' ? 'fishbowl-summary.pdf' : 'fishbowl-transcript.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(tempDiv)
      .save();

    document.body.removeChild(tempDiv);
    setTimeout(() => setPdfFeedback(false), 2000);
  };

  const handleCopyToClipboard = async () => {
    const content = getContent();
    try {
      await navigator.clipboard.writeText(content);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // Fallback: download as file
      const blob = new Blob([content], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fishbowl-${mode}-${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const activeStyle = {
    background: 'var(--text-primary)',
    color: 'var(--bg-deep)',
  };
  const inactiveStyle = {
    background: 'transparent',
    color: 'var(--text-secondary)',
    border: '1px solid var(--border)',
  };

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-surface)' }}>
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => onModeChange('summary')}
          className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2"
          style={mode === 'summary' ? activeStyle : inactiveStyle}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6" />
            <path d="M16 13H8" />
            <path d="M16 17H8" />
            <path d="M10 9H8" />
          </svg>
          AI Summary
        </button>
        <button
          onClick={() => onModeChange('transcript')}
          className="flex-1 rounded-lg px-4 py-3 text-sm font-semibold cursor-pointer transition-all duration-200 inline-flex items-center justify-center gap-2"
          style={mode === 'transcript' ? activeStyle : inactiveStyle}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Full Transcript
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCopyToClipboard}
          className="flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold cursor-pointer transition-all duration-200 hover:brightness-95 inline-flex items-center justify-center gap-1.5"
          style={{
            background: copyFeedback ? 'var(--accent-gold)' : 'var(--bg-elevated)',
            color: copyFeedback ? 'var(--bg-deep)' : 'var(--text-primary)',
          }}
        >
          {copyFeedback ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
              Copy
            </>
          )}
        </button>
        <button
          onClick={handleDownloadMarkdown}
          className="flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold cursor-pointer transition-all duration-200 hover:brightness-110 inline-flex items-center justify-center gap-1.5"
          style={{
            background: mdFeedback ? 'var(--accent-gold)' : 'var(--accent-gold)',
            color: 'var(--bg-deep)',
            opacity: mdFeedback ? 1 : 0.9,
          }}
        >
          {mdFeedback ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Downloaded!
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Markdown
            </>
          )}
        </button>
        <button
          onClick={handleDownloadPdf}
          className="flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold cursor-pointer transition-all duration-200 hover:brightness-110 inline-flex items-center justify-center gap-1.5"
          style={{
            background: pdfFeedback ? 'var(--accent-gold)' : 'var(--accent-warm)',
            color: '#ffffff',
          }}
        >
          {pdfFeedback ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Downloaded!
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              PDF
            </>
          )}
        </button>
      </div>
    </div>
  );
}
