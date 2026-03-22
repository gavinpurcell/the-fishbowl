'use client';

interface Props {
  summary: string | null;
}

/**
 * Renders the AI-generated summary with basic markdown-like formatting.
 * Handles ## headings, **bold**, bullet lists, and paragraphs.
 */
export default function Summary({ summary }: Props) {
  if (!summary) {
    return (
      <div className="text-center py-12">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No summary available.</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Switch to Full Transcript to see the raw discussion.</p>
      </div>
    );
  }

  // Parse the summary into rendered elements
  const lines = summary.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    // ## Heading
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-base font-bold mt-5 mb-2" style={{ color: 'var(--text-primary)' }}>
          {trimmed.slice(3)}
        </h3>
      );
      continue;
    }

    // # Heading
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={i} className="text-lg font-bold mt-5 mb-2" style={{ color: 'var(--text-primary)' }}>
          {trimmed.slice(2)}
        </h2>
      );
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletText = trimmed.slice(2);
      elements.push(
        <li key={i} className="text-sm ml-4 list-disc leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {renderInlineFormatting(bulletText)}
        </li>
      );
      continue;
    }

    // Numbered list items
    if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, '');
      elements.push(
        <li key={i} className="text-sm ml-4 list-decimal leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {renderInlineFormatting(text)}
        </li>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-sm leading-relaxed mb-2" style={{ color: 'var(--text-secondary)' }}>
        {renderInlineFormatting(trimmed)}
      </p>
    );
  }

  return <div>{elements}</div>;
}

/** Render **bold** inline text */
function renderInlineFormatting(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    // Odd indices are the bold content (captured group)
    if (i % 2 === 1) {
      return <strong key={i} className="font-semibold" style={{ color: 'var(--text-primary)' }}>{part}</strong>;
    }
    return part || null;
  });
}
