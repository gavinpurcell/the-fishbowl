'use client';

import { useState, useRef, useEffect } from 'react';

const MAX_LENGTH = 500;
const WARN_THRESHOLD = 400;

interface Props {
  onSubmit: (question: string) => void;
  disabled: boolean;
  onWrapUp?: () => void;
}

export default function ModerationInput({ onSubmit, disabled, onWrapUp }: Props) {
  const [question, setQuestion] = useState('');
  const [mounted, setMounted] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Trigger entrance animation on mount
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Auto-focus the textarea when it becomes enabled (panelists done responding)
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }, [question]);

  const canSubmit = question.trim().length > 0 && !disabled;
  const charCount = question.length;
  const isNearLimit = charCount >= WARN_THRESHOLD;
  const isAtLimit = charCount >= MAX_LENGTH;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canSubmit) return;
    onSubmit(question.trim());
    setQuestion('');
    // Blur so spacebar advances the scene instead of typing in the input
    (document.activeElement as HTMLElement)?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter submits, Shift+Enter inserts newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Suppress unused variable warnings from removed UI elements
  void charCount; void isNearLimit; void isAtLimit;

  return (
    <form
      onSubmit={handleSubmit}
      className="moderation-input-form"
      style={{
        opacity: mounted ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      {/* Compact single-row input — mic icon, textarea, send button */}
      <div
        className="flex gap-2 items-center rounded-lg"
        style={{
          background: 'rgba(26, 23, 20, 0.85)',
          border: '1px solid rgba(196,154,42,0.2)',
          padding: '6px 8px',
        }}
      >
        {/* Mic icon */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0" style={{ opacity: 0.5 }}>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        </svg>

        <textarea
          ref={textareaRef}
          value={question}
          aria-label="Ask the panelists a question"
          onChange={(e) => {
            if (e.target.value.length <= MAX_LENGTH) {
              setQuestion(e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask the panel..."
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.85)',
            padding: '4px 8px',
            fontSize: '13px',
            fontFamily: "'DM Mono', monospace",
            lineHeight: '1.4',
            outline: 'none',
            minHeight: '28px',
            maxHeight: '60px',
          }}
        />

        {/* Send button — small pill */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-shrink-0 flex items-center gap-1 transition-all"
          style={{
            background: canSubmit ? 'var(--accent-gold)' : 'rgba(255,255,255,0.06)',
            color: canSubmit ? 'var(--dark-surface)' : 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 12px',
            fontFamily: "'Silkscreen', monospace",
            fontSize: '8px',
            letterSpacing: '0.06em',
            cursor: canSubmit ? 'pointer' : 'default',
          }}
        >
          SEND
        </button>

        {/* End show — small text button */}
        {onWrapUp && (
          <button
            type="button"
            onClick={onWrapUp}
            className="flex-shrink-0 transition-all"
            style={{
              background: 'none',
              border: '1px solid rgba(196,154,42,0.3)',
              borderRadius: '6px',
              padding: '5px 10px',
              fontFamily: "'Silkscreen', monospace",
              fontSize: '7px',
              letterSpacing: '0.06em',
              color: 'var(--accent-gold)',
              cursor: 'pointer',
              opacity: 0.7,
            }}
          >
            END
          </button>
        )}
      </div>
    </form>
  );
}
