'use client';

import { useState, useRef, useEffect } from 'react';

const MAX_LENGTH = 500;
const WARN_THRESHOLD = 400;

interface Props {
  onSubmit: (question: string) => void;
  disabled: boolean;
}

export default function ModerationInput({ onSubmit, disabled }: Props) {
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

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-2"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.4s ease-out, transform 0.4s ease-out',
      }}
    >
      {/* Label */}
      <div className="flex items-center justify-between px-1">
        <span
          className="label-mono"
          style={{ color: disabled ? 'var(--text-muted)' : 'var(--accent-gold)' }}
        >
          {disabled ? 'Panelists are responding...' : 'Your question'}
        </span>
        {isNearLimit && (
          <span
            className="label-mono"
            style={{
              color: isAtLimit ? 'var(--accent-warm)' : 'var(--text-muted)',
              transition: 'color 0.2s',
            }}
          >
            {charCount}/{MAX_LENGTH}
          </span>
        )}
      </div>

      {/* Input row */}
      <div
        className="flex gap-2 items-end rounded-xl transition-all"
        style={{
          background: 'var(--bg-surface)',
          border: disabled
            ? '1px solid var(--border)'
            : '1px solid var(--border-light)',
          padding: '4px 4px 4px 0',
          boxShadow: disabled
            ? 'none'
            : '0 1px 4px rgba(0,0,0,0.04), inset 0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={question}
          onChange={(e) => {
            if (e.target.value.length <= MAX_LENGTH) {
              setQuestion(e.target.value);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? 'Waiting for panelists to finish...'
              : 'Ask the panelists a follow-up question...'
          }
          disabled={disabled}
          rows={1}
          className="flex-1 px-4 py-3 text-sm resize-none disabled:opacity-40"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            outline: 'none',
            lineHeight: '1.5',
            fontFamily: 'inherit',
            minHeight: '44px',
            maxHeight: '120px',
          }}
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="flex-shrink-0 flex items-center justify-center gap-2 px-5 py-3 rounded-lg text-sm font-500 transition-all cursor-pointer"
          style={{
            background: canSubmit ? 'var(--accent-gold)' : 'var(--bg-elevated)',
            color: canSubmit ? 'var(--bg-deep)' : 'var(--text-muted)',
            opacity: canSubmit ? 1 : 0.5,
            minWidth: '72px',
            height: '40px',
          }}
          onMouseEnter={(e) => {
            if (canSubmit) {
              (e.currentTarget as HTMLElement).style.background = 'var(--accent-gold-dim)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (canSubmit) {
              (e.currentTarget as HTMLElement).style.background = 'var(--accent-gold)';
              (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
            }
          }}
        >
          {disabled ? (
            // Loading spinner
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              style={{ animation: 'spin 1s linear infinite' }}
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="28"
                strokeDashoffset="8"
              />
            </svg>
          ) : (
            <>
              Ask
              {/* Send arrow icon */}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Keyboard hint */}
      <div className="flex justify-end px-1">
        <span className="label-mono" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
          Enter to send &middot; Shift+Enter for new line
        </span>
      </div>
    </form>
  );
}
