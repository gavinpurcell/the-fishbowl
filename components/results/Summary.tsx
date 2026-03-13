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
      <div className="text-center text-gray-400 py-8">
        No summary available.
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
        <h3 key={i} className="text-base font-bold text-gray-800 mt-4 mb-2">
          {trimmed.slice(3)}
        </h3>
      );
      continue;
    }

    // # Heading
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-gray-900 mt-4 mb-2">
          {trimmed.slice(2)}
        </h2>
      );
      continue;
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const bulletText = trimmed.slice(2);
      elements.push(
        <li key={i} className="text-sm text-gray-700 ml-4 list-disc leading-relaxed">
          {renderInlineFormatting(bulletText)}
        </li>
      );
      continue;
    }

    // Numbered list items
    if (/^\d+\.\s/.test(trimmed)) {
      const text = trimmed.replace(/^\d+\.\s/, '');
      elements.push(
        <li key={i} className="text-sm text-gray-700 ml-4 list-decimal leading-relaxed">
          {renderInlineFormatting(text)}
        </li>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-sm text-gray-700 leading-relaxed mb-2">
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
      return <strong key={i} className="font-semibold">{part}</strong>;
    }
    return part || null;
  });
}
