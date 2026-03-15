'use client';

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
  const handleDownloadMarkdown = () => {
    const content =
      mode === 'summary' && summary
        ? summaryToMarkdown(summary)
        : transcriptToMarkdown(transcript);

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = mode === 'summary' ? 'fishbowl-summary.md' : 'fishbowl-transcript.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = async () => {
    const content =
      mode === 'summary' && summary
        ? summaryToMarkdown(summary)
        : transcriptToMarkdown(transcript);

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
  };

  const activeStyle = {
    background: 'var(--text-primary)',
    color: 'var(--bg-deep)',
  };
  const inactiveStyle = {
    background: 'var(--bg-surface)',
    color: 'var(--text-secondary)',
  };

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: 'var(--bg-surface)' }}>
      {/* Mode toggle */}
      <div className="flex gap-3">
        <button
          onClick={() => onModeChange('summary')}
          className="flex-1 rounded-lg px-4 py-3 text-sm font-600 transition-all"
          style={mode === 'summary' ? activeStyle : inactiveStyle}
        >
          AI Summary
        </button>
        <button
          onClick={() => onModeChange('transcript')}
          className="flex-1 rounded-lg px-4 py-3 text-sm font-600 transition-all"
          style={mode === 'transcript' ? activeStyle : inactiveStyle}
        >
          Full Transcript
        </button>
      </div>

      {/* Download buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleDownloadMarkdown}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm font-600 transition-all"
          style={{
            background: 'var(--accent-gold)',
            color: 'var(--bg-deep)',
          }}
        >
          Download Markdown
        </button>
        <button
          onClick={handleDownloadPdf}
          className="flex-1 rounded-lg px-4 py-2.5 text-sm font-600 transition-all"
          style={{
            background: 'var(--accent-warm)',
            color: '#ffffff',
          }}
        >
          Download PDF
        </button>
      </div>
    </div>
  );
}
