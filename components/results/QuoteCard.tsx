'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { TranscriptEntry, Panelist } from '@/engine/types';

interface QuoteCardProps {
  transcript: TranscriptEntry[];
  panelists: Panelist[];
  ideaText?: string;
}

interface QuoteOption {
  text: string;
  panelistName: string;
  role: string;
  spriteIndex: number;
}

/** Pick one best quote per panelist — the punchiest sentence from their contributions */
function pickQuotes(transcript: TranscriptEntry[], panelists: Panelist[]): QuoteOption[] {
  const panelistMap = new Map(panelists.map(p => [p.name, p]));
  const bestByPanelist = new Map<string, QuoteOption>();

  for (const entry of transcript) {
    if (entry.round === 'summary' || entry.panelistName === 'Moderator') continue;
    const p = panelistMap.get(entry.panelistName);
    if (!p) continue;

    // Split into sentences and score them
    const sentences = entry.content
      .split(/(?<=[.!?])\s+/)
      .filter(s => s.length > 40 && s.length < 220);

    for (const s of sentences) {
      const text = s.trim();
      // Score: favor medium length (80-150 chars), strong words, questions
      let score = 100 - Math.abs(text.length - 120);
      if (/\?$/.test(text)) score += 20;
      if (/never|always|wrong|problem|gap|risk|kill|fail|mistake|disagree/i.test(text)) score += 30;
      if (/honestly|frankly|truth|real issue|elephant|nobody/i.test(text)) score += 25;

      const existing = bestByPanelist.get(p.name);
      if (!existing || score > (existing as QuoteOption & { _score?: number })._score!) {
        const option: QuoteOption & { _score?: number } = {
          text,
          panelistName: p.name,
          role: p.role,
          spriteIndex: p.spriteIndex,
          _score: score,
        };
        bestByPanelist.set(p.name, option);
      }
    }
  }

  // Return one quote per panelist, ordered by score
  return [...bestByPanelist.values()]
    .sort((a, b) => ((b as QuoteOption & { _score?: number })._score || 0) - ((a as QuoteOption & { _score?: number })._score || 0));
}

const CARD_W = 1200;
const CARD_H = 630;

async function renderQuoteCard(
  quote: QuoteOption,
  canvas: HTMLCanvasElement,
): Promise<void> {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;

  // -- Background --
  ctx.fillStyle = '#1a1714';
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // Subtle warm gradient overlay
  const grad = ctx.createLinearGradient(0, 0, 0, CARD_H);
  grad.addColorStop(0, 'rgba(232, 196, 74, 0.06)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  // -- Gold accent line at top --
  ctx.fillStyle = '#e8c44a';
  ctx.fillRect(0, 0, CARD_W, 4);

  // -- Load portrait sprite --
  const portraitSrc = `/sprites/portraits/char_${quote.spriteIndex}_portrait.png`;
  const portrait = await loadImage(portraitSrc);

  // Draw portrait — large, left side
  const portraitSize = 220;
  const portraitX = 60;
  const portraitY = CARD_H / 2 - portraitSize / 2 - 10;

  // Circular clip with gold border
  ctx.save();
  ctx.beginPath();
  ctx.arc(portraitX + portraitSize / 2, portraitY + portraitSize / 2, portraitSize / 2 + 4, 0, Math.PI * 2);
  ctx.fillStyle = '#e8c44a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(portraitX + portraitSize / 2, portraitY + portraitSize / 2, portraitSize / 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = false; // keep pixel art crisp
  ctx.drawImage(portrait, portraitX, portraitY, portraitSize, portraitSize);
  ctx.restore();

  // -- Name + Role below portrait --
  ctx.textAlign = 'center';
  const nameCenterX = portraitX + portraitSize / 2;

  ctx.font = 'bold 24px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(quote.panelistName, nameCenterX, portraitY + portraitSize + 35);

  ctx.font = '18px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#e8c44a';
  ctx.fillText(quote.role, nameCenterX, portraitY + portraitSize + 60);

  // -- Quote text — right side --
  ctx.textAlign = 'left';
  const quoteX = 340;
  const quoteMaxW = CARD_W - quoteX - 60;

  // Big open quote mark
  ctx.font = 'bold 120px Georgia, serif';
  ctx.fillStyle = 'rgba(232, 196, 74, 0.3)';
  ctx.fillText('\u201C', quoteX - 15, 120);

  // Quote text
  ctx.font = '28px Helvetica, Arial, sans-serif';
  ctx.fillStyle = '#f0e8d8';
  const lines = wrapText(ctx, quote.text, quoteMaxW);
  const lineHeight = 38;
  const totalTextH = lines.length * lineHeight;
  const startY = Math.max(100, CARD_H / 2 - totalTextH / 2);

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], quoteX, startY + i * lineHeight);
  }

  // -- Fishbowl branding — bottom right --
  ctx.textAlign = 'right';
  ctx.font = 'bold 18px Courier, monospace';
  ctx.fillStyle = 'rgba(232, 196, 74, 0.6)';
  ctx.fillText('THE FISHBOWL', CARD_W - 50, CARD_H - 45);

  ctx.font = '14px Helvetica, Arial, sans-serif';
  ctx.fillStyle = 'rgba(240, 232, 216, 0.4)';
  ctx.fillText('fishbowl.show', CARD_W - 50, CARD_H - 25);

  // -- Gold accent line at bottom --
  ctx.fillStyle = '#e8c44a';
  ctx.fillRect(0, CARD_H - 4, CARD_W, 4);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? current + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export default function QuoteCard({ transcript, panelists, ideaText }: QuoteCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [quotes] = useState(() => pickQuotes(transcript, panelists));
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [rendered, setRendered] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = quotes[selectedIdx];
  if (!selected || quotes.length === 0) return null;

  const render = useCallback(async () => {
    if (!canvasRef.current || !selected) return;
    await renderQuoteCard(selected, canvasRef.current);
    setRendered(true);
  }, [selected]);

  // Auto-render when quote changes
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    render();
  }, [render]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = 'fishbowl-quote.png';
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handleCopyImage = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise<Blob>((resolve) => {
        canvasRef.current!.toBlob((b) => resolve(b!), 'image/png');
      });
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob }),
      ]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: download instead
      handleDownload();
    }
  };

  const handleShareX = async () => {
    if (!canvasRef.current) return;
    // Copy image to clipboard first so user can paste it
    await handleCopyImage();
    const text = encodeURIComponent(
      `"${selected.text}"\n\n\u2014 ${selected.panelistName}, AI panelist on The Fishbowl`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  return (
    <div className="mb-6">
      {/* Quote picker — one per panelist */}
      <div className="flex gap-2 mb-3">
        {quotes.map((q, i) => (
          <button
            key={q.panelistName}
            onClick={() => { setSelectedIdx(i); setRendered(false); }}
            className="px-3 py-1.5 rounded text-xs"
            style={{
              background: i === selectedIdx ? 'var(--bg-card, #302b28)' : 'transparent',
              border: i === selectedIdx ? '1px solid var(--accent-gold)' : '1px solid var(--dark-border, #3d3632)',
              color: i === selectedIdx ? 'var(--accent-gold)' : 'var(--text-secondary, #a89f94)',
              fontFamily: "'Silkscreen', monospace",
              fontSize: '10px',
              letterSpacing: '0.05em',
            }}
          >
            {q.panelistName}
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="rounded overflow-hidden" style={{ border: '1px solid var(--dark-border, #3d3632)' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: 'auto',
            aspectRatio: '1200/630',
            display: rendered ? 'block' : 'none',
            imageRendering: 'auto',
          }}
        />
        {!rendered && (
          <div className="w-full py-12 text-center" style={{ background: 'var(--bg-elevated, #282422)' }}>
            <div className="text-xs" style={{ color: 'var(--text-muted)', animation: 'introPulse 1.5s ease-in-out infinite' }}>
              Generating card...
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <button onClick={handleShareX} className="action-badge">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X (image copied)
        </button>
        <button onClick={handleCopyImage} className={`action-badge ${copied ? 'success' : ''}`}>
          {copied ? (
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
              Copy Image
            </>
          )}
        </button>
        <button onClick={handleDownload} className="action-badge">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          .png
        </button>
      </div>
    </div>
  );
}
