'use client';

/** Escape HTML special characters to prevent injection. */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface Props {
  summary: string | null;
}

/**
 * Renders the AI-generated summary as a research brief with clear
 * typography hierarchy. Handles ## headings, **bold**, bullet lists,
 * blockquotes (> lines become pull-quotes), and paragraphs.
 */
export default function Summary({ summary }: Props) {
  if (!summary) {
    return (
      <div className="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No summary available.</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Switch to Full Transcript to see the raw discussion.</p>
      </div>
    );
  }

  // Escape HTML before parsing markdown
  const escaped = escapeHtml(summary);

  // Parse the summary into rendered elements
  const lines = escaped.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    // > Blockquote — render as a pull quote with gold left border
    if (trimmed.startsWith('> ')) {
      const quoteText = trimmed.slice(2);
      // Check if there's attribution in the format "> quote — Author"
      const emDashMatch = quoteText.match(/^(.+?)\s*[—–-]\s*([^—–-]+)$/);

      elements.push(
        <div key={i} className="pull-quote">
          <p>{renderInlineFormatting(emDashMatch ? emDashMatch[1] : quoteText)}</p>
          {emDashMatch && (
            <div className="attribution">{emDashMatch[2].trim()}</div>
          )}
        </div>
      );
      continue;
    }

    // ## Heading — Silkscreen section headers
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3
          key={i}
          style={{
            fontFamily: "'Silkscreen', monospace",
            fontSize: '12px',
            letterSpacing: '0.03em',
            color: 'var(--text-primary)',
            marginTop: i === 0 ? '0' : '20px',
            marginBottom: '8px',
            paddingBottom: '6px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {trimmed.slice(3)}
        </h3>
      );
      continue;
    }

    // # Heading — larger Silkscreen header
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2
          key={i}
          style={{
            fontFamily: "'Silkscreen', monospace",
            fontSize: '13px',
            letterSpacing: '0.04em',
            color: 'var(--text-primary)',
            marginTop: i === 0 ? '0' : '24px',
            marginBottom: '10px',
            paddingBottom: '6px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          {trimmed.slice(2)}
        </h2>
      );
      continue;
    }

    // Bullet points — with subtle left accent
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletText = trimmed.slice(2);
      elements.push(
        <div
          key={i}
          className="flex gap-3 mb-1.5"
          style={{ paddingLeft: '4px' }}
        >
          <span
            style={{
              color: 'var(--accent-gold)',
              fontSize: '14px',
              lineHeight: '1.7',
              flexShrink: 0,
              opacity: 0.6,
            }}
          >
            //
          </span>
          <p
            className="text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
          >
            {renderInlineFormatting(bulletText)}
          </p>
        </div>
      );
      continue;
    }

    // Numbered list items
    if (/^\d+\.\s/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
      if (numMatch) {
        elements.push(
          <div
            key={i}
            className="flex gap-3 mb-1.5"
            style={{ paddingLeft: '4px' }}
          >
            <span
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '11px',
                color: 'var(--accent-gold)',
                opacity: 0.7,
                minWidth: '20px',
                textAlign: 'right',
                lineHeight: '1.85',
                flexShrink: 0,
              }}
            >
              {numMatch[1]}.
            </span>
            <p
              className="text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {renderInlineFormatting(numMatch[2])}
            </p>
          </div>
        );
        continue;
      }
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
        {renderInlineFormatting(trimmed)}
      </p>
    );
  }

  return <div className="summary-content">{elements}</div>;
}

/** Render **bold** inline text with emphasis styling */
function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    // Odd indices are the bold content (captured group)
    if (i % 2 === 1) {
      return (
        <strong
          key={i}
          className="font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {part}
        </strong>
      );
    }
    return part || null;
  });
}
