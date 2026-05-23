'use client';

import { useState, useCallback } from 'react';
import type { TranscriptEntry, Panelist } from '@/engine/types';

interface ExportPanelProps {
  transcript: TranscriptEntry[];
  summary: string | null;
  mode: 'summary' | 'transcript';
  onModeChange: (mode: 'summary' | 'transcript') => void;
  ideaText?: string;
  sessionDate?: number | null;
  panelists?: Panelist[];
}

function slugify(text: string, maxLen = 50): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, maxLen)
    .replace(/-$/, '');
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

/** Truncate idea text into a short project-style title */
function projectTitle(ideaText: string | undefined, maxLen = 80): string {
  if (!ideaText) return 'Untitled Session';
  const cleaned = ideaText.replace(/\n/g, ' ').trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen).replace(/\s+\S*$/, '') + '...';
}

function formatDate(timestamp: number | null | undefined): string {
  const d = timestamp ? new Date(timestamp) : new Date();
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function ExportPanel({ transcript, summary, mode, onModeChange, ideaText, sessionDate, panelists }: ExportPanelProps) {
  const [mdFeedback, setMdFeedback] = useState(false);
  const [pdfFeedback, setPdfFeedback] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  const fileBase = ideaText ? slugify(ideaText) || 'fishbowl' : 'fishbowl';

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
    a.download = `${fileBase}-${mode}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setMdFeedback(true);
    setTimeout(() => setMdFeedback(false), 2000);
  };

  /** Load an image as a base64 data URL */
  function loadImageAsDataUrl(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  /** Render text to a canvas using a browser font, return as data URL */
  function renderTextAsImage(
    text: string,
    font: string,
    sizePx: number,
    color: string,
  ): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    ctx.font = `${sizePx}px ${font}`;
    const metrics = ctx.measureText(text);
    // Size canvas to fit text with padding
    canvas.width = Math.ceil(metrics.width) + 4;
    canvas.height = Math.ceil(sizePx * 1.3);
    // Re-set font after resize (canvas reset clears it)
    ctx.font = `${sizePx}px ${font}`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    ctx.fillText(text, 2, sizePx * 0.15);
    return canvas.toDataURL('image/png');
  }

  const handleDownloadPdf = async () => {
    const content = getContent();

    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      const footerY = pageHeight - 12;

      // -- Load assets for letterhead --
      const fishbowlDataUrl = await loadImageAsDataUrl('/fishbowl-icon.png');
      const wordmarkDataUrl = renderTextAsImage(
        'THE FISHBOWL',
        "'Silkscreen', 'Courier New', monospace",
        48,
        '#1a1714',
      );
      const taglineDataUrl = renderTextAsImage(
        'Your idea. Four AI experts. One honest conversation.',
        "'Outfit', 'Helvetica', sans-serif",
        20,
        '#8c877d',
      );

      // -- Draw letterhead on first page --
      const iconSize = 18;
      const iconX = margin;
      const iconY = 8;
      doc.addImage(fishbowlDataUrl, 'PNG', iconX, iconY, iconSize, iconSize);

      const textX = margin + iconSize + 4;
      // Wordmark — rendered in Silkscreen via canvas
      doc.addImage(wordmarkDataUrl, 'PNG', textX, iconY + 2, 52, 8);
      // Tagline
      doc.addImage(taglineDataUrl, 'PNG', textX, iconY + 11, 80, 4);

      // Gold divider
      doc.setDrawColor(232, 196, 74);
      doc.setLineWidth(0.5);
      doc.line(margin, iconY + iconSize + 3, pageWidth - margin, iconY + iconSize + 3);

      // -- Project / Date --
      let y = iconY + iconSize + 7;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(140, 135, 125);
      doc.text('PROJECT', margin, y);
      doc.text('DATE', pageWidth - margin - 30, y);

      y += 5.5;
      doc.setFontSize(11.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(26, 23, 20);
      doc.text(projectTitle(ideaText), margin, y);
      doc.text(formatDate(sessionDate), pageWidth - margin - 30, y);

      y += 9;

      // Build a name→role lookup and track first mentions
      const roleByName: Record<string, string> = {};
      if (panelists) {
        for (const p of panelists) {
          roleByName[p.name] = p.role;
        }
      }
      const namesShown = new Set<string>();

      const lines = content.split('\n');

      for (const line of lines) {
        if (y > footerY - 8) {
          doc.addPage();
          y = margin;
        }

        if (line.startsWith('# ')) {
          doc.setFontSize(16);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(26, 23, 20);
          doc.text(line.replace(/^# /, ''), margin, y);
          y += 9;
        } else if (line.startsWith('## ')) {
          y += 3;
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(26, 23, 20);
          doc.text(line.replace(/^## /, ''), margin, y);
          y += 2;
          doc.setDrawColor(232, 196, 74);
          doc.setLineWidth(0.4);
          doc.line(margin, y, pageWidth - margin, y);
          y += 6;
        } else if (line.trim() === '') {
          y += 3;
        } else {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(50, 50, 50);

          const cleaned = line.replace(/\*\*(.+?)\*\*/g, '$1');
          const boldMatch = line.match(/^\*\*(.+?)\*\*:/);

          // On first mention, append (Role) after the name
          let displayName = '';
          if (boldMatch) {
            const rawName = boldMatch[1];
            displayName = rawName + ':';
            if (!namesShown.has(rawName) && roleByName[rawName]) {
              displayName = rawName + ' (' + roleByName[rawName] + '):';
              namesShown.add(rawName);
            }
          }

          // Re-wrap with potentially longer display name
          const bodyText = boldMatch
            ? displayName + ' ' + cleaned.slice((boldMatch[1] + ':').length).trimStart()
            : cleaned;
          const wrapped = doc.splitTextToSize(bodyText, maxWidth);

          for (let wi = 0; wi < wrapped.length; wi++) {
            if (y > footerY - 8) {
              doc.addPage();
              y = margin;
            }
            if (wi === 0 && boldMatch) {
              doc.setFont('helvetica', 'bold');
              doc.setTextColor(26, 23, 20);
              doc.text(displayName, margin, y);
              const nameWidth = doc.getTextWidth(displayName) + 1;
              doc.setFont('helvetica', 'normal');
              doc.setTextColor(50, 50, 50);
              const rest = wrapped[wi].slice(displayName.length).trimStart();
              if (rest) doc.text(rest, margin + nameWidth, y);
            } else {
              doc.text(wrapped[wi], margin, y);
            }
            y += 5;
          }
        }
      }

      // -- Footer on every page --
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setDrawColor(232, 196, 74);
        doc.setLineWidth(0.3);
        doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(160, 155, 145);
        doc.text('The Fishbowl  \u2022  fishbowl.show', margin, footerY);
        doc.text(`${i} / ${totalPages}`, pageWidth - margin, footerY, { align: 'right' });
      }

      doc.save(`${fileBase}-${mode}.pdf`);

      setPdfFeedback(true);
      setTimeout(() => setPdfFeedback(false), 2000);
    } catch (err) {
      console.error('PDF generation failed:', err);
    }
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
      a.download = `${fileBase}-${mode}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div
      className="specimen-card"
      style={{ ['--brass-accent' as string]: 'var(--accent-gold)' }}
    >
      <div className="brass-plate">
        <div className="brass-screw" />
        <span className="brass-label">EXPORT · ARCHIVE</span>
        <div className="brass-screw" />
      </div>
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Document type toggle — classified document tabs */}
          <div className="flex">
            <button
              onClick={() => onModeChange('summary')}
              className={`doc-tab ${mode === 'summary' ? 'active' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
                <path d="M16 13H8" />
                <path d="M16 17H8" />
                <path d="M10 9H8" />
              </svg>
              Summary
            </button>
            <button
              onClick={() => onModeChange('transcript')}
              className={`doc-tab ${mode === 'transcript' ? 'active' : ''}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Transcript
            </button>
          </div>

          {/* Action badges — compact export row */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyToClipboard}
              className={`action-badge ${copyFeedback ? 'success' : ''}`}
            >
              {copyFeedback ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Copied
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handleDownloadMarkdown}
              className={`action-badge ${mdFeedback ? 'success' : ''}`}
            >
              {mdFeedback ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Saved
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  .md
                </>
              )}
            </button>
            <button
              onClick={handleDownloadPdf}
              className={`action-badge ${pdfFeedback ? 'success' : ''}`}
            >
              {pdfFeedback ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  Saved
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  .pdf
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
