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

  return (
    <form
      onSubmit={handleSubmit}
      className="moderation-input-form"
      style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(20px)',
        transition: 'opacity 0.5s cubic-bezier(0.22, 1, 0.36, 1), transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Control panel frame */}
      <div
        className="rounded-xl overflow-hidden"
        style={{
          background: 'var(--dark-surface)',
          border: '1px solid var(--dark-border)',
          boxShadow: '0 4px 24px rgba(0,0,0,0.15), 0 0 1px rgba(196,154,42,0.2)',
        }}
      >
        {/* Header strip — MODERATOR label */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{
            background: 'linear-gradient(90deg, rgba(196,154,42,0.15), rgba(196,154,42,0.05))',
            borderBottom: '1px solid rgba(196,154,42,0.15)',
          }}
        >
          <div className="flex items-center gap-2">
            {/* Intercom icon */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            <span
              style={{
                fontFamily: "'Silkscreen', monospace",
                fontSize: '9px',
                letterSpacing: '0.1em',
                color: 'var(--accent-gold)',
              }}
            >
              MODERATOR
            </span>
          </div>

          {/* Right side: status indicator or char count */}
          <div className="flex items-center gap-2">
            {disabled ? (
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: 'var(--accent-red)',
                    boxShadow: '0 0 6px rgba(232, 90, 74, 0.6)',
                    animation: 'statusPulse 1.5s ease-in-out infinite',
                  }}
                />
                <span
                  style={{
                    fontFamily: "'Silkscreen', monospace",
                    fontSize: '8px',
                    letterSpacing: '0.08em',
                    color: 'var(--accent-red)',
                  }}
                >
                  ON AIR
                </span>
              </div>
            ) : (
              isNearLimit && (
                <span
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '10px',
                    fontWeight: 500,
                    color: isAtLimit ? 'var(--accent-red)' : 'rgba(255,255,255,0.3)',
                    transition: 'color 0.2s',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {charCount}/{MAX_LENGTH}
                </span>
              )
            )}
          </div>
        </div>

        {/* Textarea + button row */}
        <div className="flex gap-2 items-end p-3">
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
            placeholder={
              disabled
                ? 'Panelists are responding...'
                : 'Pass a note to the panel...'
            }
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.85)',
              padding: '10px 14px',
              fontSize: '14px',
              fontFamily: "'DM Mono', monospace",
              lineHeight: '1.5',
              outline: 'none',
              minHeight: '44px',
              maxHeight: '120px',
              transition: 'border-color 0.2s, background 0.2s',
              ...(disabled ? {} : {}),
            }}
            onFocus={(e) => {
              if (!disabled) {
                e.currentTarget.style.borderColor = 'rgba(196,154,42,0.3)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              }
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
            }}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!canSubmit}
            aria-label={disabled ? 'Panelists are responding' : 'Send question'}
            className="flex-shrink-0 flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: canSubmit
                ? 'var(--accent-gold)'
                : disabled
                  ? 'rgba(232, 90, 74, 0.08)'
                  : 'rgba(255,255,255,0.06)',
              color: canSubmit
                ? 'var(--dark-surface)'
                : disabled
                  ? 'rgba(232, 90, 74, 0.5)'
                  : 'rgba(255,255,255,0.2)',
              border: canSubmit
                ? '1px solid var(--accent-gold)'
                : disabled
                  ? '1px solid rgba(232, 90, 74, 0.15)'
                  : '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '10px 16px',
              fontFamily: "'Silkscreen', monospace",
              fontSize: '9px',
              letterSpacing: '0.06em',
              cursor: canSubmit ? 'pointer' : 'default',
              minWidth: '72px',
              height: '44px',
              transition: 'all 0.15s ease',
              boxShadow: canSubmit ? '0 0 12px rgba(196, 154, 42, 0.25)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (canSubmit) {
                const el = e.currentTarget;
                el.style.background = 'var(--accent-gold-dim)';
                el.style.transform = 'translateY(-1px)';
                el.style.boxShadow = '0 0 20px rgba(196, 154, 42, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (canSubmit) {
                const el = e.currentTarget;
                el.style.background = 'var(--accent-gold)';
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = '0 0 12px rgba(196, 154, 42, 0.25)';
              }
            }}
            onMouseDown={(e) => {
              if (canSubmit) {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(1px)';
              }
            }}
            onMouseUp={(e) => {
              if (canSubmit) {
                (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
              }
            }}
          >
            {disabled ? (
              // Pulsing mic icon when on air
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                style={{ animation: 'statusPulse 1.5s ease-in-out infinite' }}
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              </svg>
            ) : (
              <>
                SEND
                {/* Arrow icon */}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center justify-between px-4 pb-2"
        >
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '9px',
              color: 'rgba(255,255,255,0.2)',
              letterSpacing: '0.04em',
            }}
          >
            {disabled ? 'Waiting for panel response...' : 'Enter to send / Shift+Enter for new line'}
          </span>
        </div>
      </div>

      {/* Prominent END SHOW button — broadcast control room CTA */}
      {onWrapUp && !disabled && (
        <div
          className="mt-4 flex flex-col items-center gap-2"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s, transform 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s',
          }}
        >
          {/* Hint text with clickable Wrap Up */}
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '12px',
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.02em',
            }}
          >
            Ask another question, or{' '}
            <button
              onClick={onWrapUp}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Silkscreen', monospace",
                fontSize: '11px',
                color: 'var(--accent-gold)',
                letterSpacing: '0.06em',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                textDecorationColor: 'rgba(196, 154, 42, 0.4)',
                padding: 0,
                transition: 'color 0.15s ease, text-decoration-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--accent-gold-light)';
                e.currentTarget.style.textDecorationColor = 'var(--accent-gold)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--accent-gold)';
                e.currentTarget.style.textDecorationColor = 'rgba(196, 154, 42, 0.4)';
              }}
            >
              wrap up the session
            </button>
          </p>

          {/* Big END SHOW button */}
          <button
            onClick={onWrapUp}
            style={{
              fontFamily: "'Silkscreen', monospace",
              fontSize: '14px',
              letterSpacing: '0.1em',
              padding: '14px 32px',
              borderRadius: '8px',
              border: '2px solid var(--accent-gold)',
              cursor: 'pointer',
              background: 'linear-gradient(180deg, rgba(196, 154, 42, 0.2) 0%, rgba(196, 154, 42, 0.08) 100%)',
              color: 'var(--accent-gold-light)',
              textTransform: 'uppercase',
              animation: 'wrapGoldPulse 3s ease-in-out infinite',
              position: 'relative',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.background = 'linear-gradient(180deg, rgba(196, 154, 42, 0.35) 0%, rgba(196, 154, 42, 0.15) 100%)';
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = '0 0 24px rgba(196, 154, 42, 0.5), 0 0 48px rgba(196, 154, 42, 0.2), 0 4px 12px rgba(0,0,0,0.3)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.background = 'linear-gradient(180deg, rgba(196, 154, 42, 0.2) 0%, rgba(196, 154, 42, 0.08) 100%)';
              el.style.transform = 'translateY(0)';
              el.style.boxShadow = '';
            }}
            onMouseDown={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'translateY(1px)';
              el.style.boxShadow = '0 0 12px rgba(196, 154, 42, 0.3), inset 0 2px 4px rgba(0,0,0,0.2)';
            }}
            onMouseUp={(e) => {
              const el = e.currentTarget;
              el.style.transform = 'translateY(-2px)';
              el.style.boxShadow = '0 0 24px rgba(196, 154, 42, 0.5), 0 0 48px rgba(196, 154, 42, 0.2), 0 4px 12px rgba(0,0,0,0.3)';
            }}
          >
            END SHOW
          </button>
        </div>
      )}
    </form>
  );
}
