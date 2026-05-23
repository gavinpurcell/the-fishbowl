'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import type { TranscriptEntry, Panelist } from '@/engine/types';

interface QuoteCardProps {
  transcript: TranscriptEntry[];
  panelists: Panelist[];
  topic?: string;
}

interface QuoteOption {
  text: string;
  panelistName: string;
  role: string;
  spriteIndex: number;
  panelistColor: string;
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
          panelistColor: p.color,
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

/** Deterministic 3-digit catalog number from panelist name + topic */
function catalogNumber(panelistName: string, topic: string): string {
  const str = panelistName + '|' + topic;
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  const n = (Math.abs(h) % 999) + 1;
  return String(n).padStart(3, '0');
}

/** Word-wrap text to fit maxWidth, returns array of lines */
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

/** Draw scanlines (1px every 4px) over a rect */
function drawScanlines(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  alpha = 0.012,
) {
  ctx.save();
  ctx.fillStyle = `rgba(255,255,255,${alpha})`;
  for (let row = y; row < y + h; row += 4) {
    ctx.fillRect(x, row, w, 1);
  }
  ctx.restore();
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

async function renderQuoteCard(
  quote: QuoteOption,
  canvas: HTMLCanvasElement,
  topic: string,
): Promise<void> {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;

  // Wait for fonts to be ready
  await document.fonts.ready;

  const panelistColor = quote.panelistColor || '#c49a2a';

  // ── 1. Background ──────────────────────────────────────────────────────────
  ctx.fillStyle = '#14110f';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  drawScanlines(ctx, 0, 0, CARD_W, CARD_H, 0.012);

  // ── 2. Brass plate header (full width, 56px) ───────────────────────────────
  const headerH = 56;
  const headerGrad = ctx.createLinearGradient(0, 0, 0, headerH);
  headerGrad.addColorStop(0, '#2a2422');
  headerGrad.addColorStop(1, '#1c1918');
  ctx.fillStyle = headerGrad;
  ctx.fillRect(0, 0, CARD_W, headerH);

  // Bottom accent line in panelist color
  ctx.fillStyle = panelistColor;
  ctx.fillRect(0, headerH - 2, CARD_W, 2);

  // Screws — left and right
  function drawScrew(cx: number, cy: number) {
    // Outer circle
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#524a44';
    ctx.fill();
    // Inner highlight (offset slightly for depth)
    ctx.beginPath();
    ctx.arc(cx - 1.5, cy - 1.5, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#6a6258';
    ctx.fill();
  }
  drawScrew(28, 28);
  drawScrew(1172, 28);

  // Center label "FROM THE FISHBOWL"
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8a8278';
  ctx.font = "14px 'DM Mono', monospace";
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0.18em';
  }
  ctx.fillText('FROM THE FISHBOWL', 64, 28);

  // Right catalog number — reset letter spacing first
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0.05em';
  }
  const catNum = `№ ${catalogNumber(quote.panelistName, topic)}`;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#c49a2a';
  ctx.font = "14px 'Silkscreen', monospace";
  ctx.fillText(catNum, 1144, 28);

  // Reset
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  }
  ctx.textBaseline = 'alphabetic';

  // ── 3. Portrait column (left) ─────────────────────────────────────────────
  const portraitX = 28;
  const portraitY = 128;
  const portraitSize = 200;

  // Load portrait sprite
  const portraitSrc = `/sprites/portraits/char_${quote.spriteIndex}_portrait.png`;
  let portrait: HTMLImageElement | null = null;
  try {
    portrait = await loadImage(portraitSrc);
  } catch {
    // Portrait failed to load — draw a placeholder box
  }

  // Outer border rect in panelist color
  ctx.fillStyle = panelistColor;
  ctx.fillRect(portraitX - 4, portraitY - 4, portraitSize + 8, portraitSize + 8);

  // Dark inset background
  ctx.fillStyle = '#0a0908';
  ctx.fillRect(portraitX, portraitY, portraitSize, portraitSize);

  // Draw portrait with pixelated rendering
  if (portrait) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(portrait, portraitX, portraitY, portraitSize, portraitSize);
    ctx.imageSmoothingEnabled = true;
  }

  // Scanline overlay on portrait only
  drawScanlines(ctx, portraitX, portraitY, portraitSize, portraitSize, 0.018);

  // Panelist NAME centered over portrait x-range
  const nameCenterX = portraitX + portraitSize / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = "18px 'Silkscreen', monospace";
  ctx.fillStyle = '#faf6f0';
  ctx.fillText(quote.panelistName, nameCenterX, 352);

  // Panelist ROLE below name
  ctx.font = "10px 'DM Mono', monospace";
  ctx.fillStyle = '#c49a2a';
  ctx.fillText(quote.role.toUpperCase(), nameCenterX, 372);

  // ── 4. Quote column (right) ───────────────────────────────────────────────
  const quoteColX = 260;
  const quoteColW = CARD_W - quoteColX - 28; // 912px to x=1172

  // Measure the wrapped quote text first so we can center the whole unit.
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = "600 38px 'Outfit', sans-serif";
  const lines = wrapText(ctx, quote.text, quoteColW);
  const lineHeight = 38 * 1.3; // ~49px
  const totalTextH = lines.length * lineHeight;

  // Open-quote glyph anchored DIRECTLY above the first line of text so the
  // glyph + quote read as one tightly coupled unit. The whole unit is then
  // vertically centered against the portrait region (y=128 to y=380).
  const openQuoteH = 56; // visual height of the Silkscreen " at 56px
  const openQuoteGap = 4; // breathing room between glyph and first line
  const unitH = openQuoteH + openQuoteGap + totalTextH;
  const portraitCenterY = (128 + 380) / 2;
  const unitTop = portraitCenterY - unitH / 2;

  ctx.font = "56px 'Silkscreen', monospace";
  ctx.fillStyle = '#c49a2a';
  ctx.fillText('“', quoteColX, unitTop + openQuoteH);

  ctx.font = "600 38px 'Outfit', sans-serif";
  ctx.fillStyle = '#faf6f0';
  const startY = unitTop + openQuoteH + openQuoteGap + lineHeight * 0.8;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], quoteColX, startY + i * lineHeight);
  }

  // ── 4b. Marketing CTA ──────────────────────────────────────────────────────
  // Big, centered, in the empty band between the quote and the bottom strip.
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0em';
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = "700 26px 'Outfit', sans-serif";
  ctx.fillStyle = '#c49a2a';
  ctx.fillText('Test your idea on a panel of AI experts at fishbowl.show', CARD_W / 2, 518);

  // ── 5. Bottom strip ────────────────────────────────────────────────────────
  // Dashed separator line
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#524a44';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, 560);
  ctx.lineTo(1172, 560);
  ctx.stroke();
  ctx.restore();

  // Left: Observation Request label + truncated topic
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = "12px 'DM Mono', monospace";
  ctx.fillStyle = '#8a8278';
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0.08em';
  }

  const topicLabel = 'OBSERVATION REQUEST: ';
  const labelWidth = ctx.measureText(topicLabel).width;
  const maxTopicWidth = 700 - labelWidth;

  let topicDisplay = topic.toUpperCase();
  if (ctx.measureText(topicDisplay).width > maxTopicWidth) {
    // Truncate with ellipsis
    while (ctx.measureText(topicDisplay + '…').width > maxTopicWidth && topicDisplay.length > 0) {
      topicDisplay = topicDisplay.slice(0, -1);
    }
    topicDisplay = topicDisplay.trimEnd() + '…';
  }

  ctx.fillText(topicLabel + topicDisplay, 28, 590);

  // Right: fishbowl.show in gold
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0.08em';
  }
  ctx.textAlign = 'right';
  ctx.fillStyle = '#c49a2a';
  ctx.fillText('FISHBOWL.SHOW', 1172, 590);

  // Reset
  if ('letterSpacing' in ctx) {
    (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  }
  ctx.textBaseline = 'alphabetic';
}

export default function QuoteCard({ transcript, panelists, topic = '' }: QuoteCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [quotes] = useState(() => pickQuotes(transcript, panelists));
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [rendered, setRendered] = useState(false);
  const [copied, setCopied] = useState(false);

  const selected = quotes[selectedIdx] ?? null;

  const render = useCallback(async () => {
    if (!canvasRef.current || !selected) return;
    await renderQuoteCard(selected, canvasRef.current, topic);
    setRendered(true);
  }, [selected, topic]);

  // Auto-render when quote changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- render() draws to canvas then sets rendered flag
    render();
  }, [render]);

  if (!selected || quotes.length === 0) return null;

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
      `"${selected.text}"\n\n— ${selected.panelistName}, AI panelist on The Fishbowl`
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
