'use client';

import { useState } from 'react';

interface Props {
  onSubmit: (question: string) => void;
  disabled: boolean;
}

export default function ModerationInput({ onSubmit, disabled }: Props) {
  const [question, setQuestion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || disabled) return;
    onSubmit(question.trim());
    setQuestion('');
    // Blur so spacebar advances the scene instead of typing in the input
    (document.activeElement as HTMLElement)?.blur();
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask the panel a question..."
        disabled={disabled}
        className="flex-1 px-4 py-3 rounded-xl text-sm disabled:opacity-40"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          color: 'var(--text-primary)',
          outline: 'none',
        }}
      />
      <button
        type="submit"
        disabled={disabled || !question.trim()}
        className="px-5 py-3 rounded-xl text-sm font-500 transition-all disabled:opacity-30"
        style={{ background: 'var(--accent-gold)', color: 'var(--bg-deep)' }}
      >
        Ask
      </button>
    </form>
  );
}
