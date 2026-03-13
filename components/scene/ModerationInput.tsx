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
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 max-w-[800px] mx-auto mt-4">
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Ask the panel a question or give a directive..."
        disabled={disabled}
        className="flex-1 px-4 py-3 border rounded-lg text-sm disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled || !question.trim()}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        Ask
      </button>
    </form>
  );
}
