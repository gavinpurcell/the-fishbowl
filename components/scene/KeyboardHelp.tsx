'use client';

import { useEffect, useState, useCallback } from 'react';

interface Shortcut {
  key: string;
  label: string;
  description: string;
}

interface KeyboardHelpProps {
  /** Extra shortcuts specific to the page (beyond the defaults) */
  extraShortcuts?: Shortcut[];
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { key: 'Space', label: 'SPACE', description: 'Continue / advance to next panelist' },
  { key: '?', label: '?', description: 'Toggle this help overlay' },
  { key: 'Esc', label: 'ESC', description: 'Close overlay / dismiss' },
];

export default function KeyboardHelp({ extraShortcuts = [] }: KeyboardHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAppeared, setHasAppeared] = useState(false);

  // Mark that the badge has finished its entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setHasAppeared(true), 2400);
    return () => clearTimeout(timer);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Global keyboard listener for "?" and Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Don't capture when user is typing in an input or textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        close();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, toggle, close]);

  const allShortcuts = [...DEFAULT_SHORTCUTS, ...extraShortcuts];

  return (
    <>
      {/* Badge — fixed bottom-right "?" button */}
      <button
        onClick={toggle}
        aria-label="Keyboard shortcuts"
        className={`kbd-help-badge ${!hasAppeared ? 'kbd-help-badge-enter' : ''}`}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 50,
          width: '36px',
          height: '36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          border: '1.5px solid var(--accent-gold)',
          background: 'var(--dark-surface)',
          color: 'var(--accent-gold)',
          fontFamily: "'Silkscreen', 'Courier New', monospace",
          fontSize: '14px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 12px rgba(196,154,42,0.1)',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.5), 0 0 20px rgba(196,154,42,0.2)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.4), 0 0 12px rgba(196,154,42,0.1)';
        }}
      >
        ?
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={close}
            className="kbd-overlay-backdrop"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(13, 11, 9, 0.7)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          />

          {/* Panel */}
          <div
            className="kbd-overlay-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '380px',
              margin: '0 16px',
              background: 'var(--dark-surface)',
              border: '1.5px solid var(--accent-gold)',
              borderRadius: '12px',
              boxShadow: '0 0 40px rgba(196,154,42,0.12), 0 20px 60px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}
          >
            {/* Top gold accent line */}
            <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 5%, var(--accent-gold) 30%, var(--accent-gold-light) 50%, var(--accent-gold) 70%, transparent 95%)' }} />

            {/* Header */}
            <div style={{ padding: '18px 22px 0' }}>
              <div
                style={{
                  fontFamily: "'Silkscreen', 'Courier New', monospace",
                  fontSize: '11px',
                  letterSpacing: '0.1em',
                  color: 'var(--accent-gold)',
                  textTransform: 'uppercase',
                }}
              >
                KEYBOARD SHORTCUTS
              </div>
              <div style={{ height: '1px', background: 'var(--dark-border)', marginTop: '14px' }} />
            </div>

            {/* Shortcut rows */}
            <div style={{ padding: '10px 22px 20px' }}>
              {allShortcuts.map((shortcut, i) => (
                <div
                  key={shortcut.key}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    padding: '10px 0',
                    borderBottom: i < allShortcuts.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  {/* Key cap */}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: shortcut.label.length > 3 ? '52px' : '32px',
                      height: '28px',
                      padding: '0 8px',
                      borderRadius: '5px',
                      fontFamily: "'DM Mono', monospace",
                      fontSize: '11px',
                      fontWeight: 500,
                      letterSpacing: '0.04em',
                      color: 'var(--accent-gold)',
                      background: 'var(--dark-deep)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderBottom: '2.5px solid rgba(255,255,255,0.06)',
                      borderTop: '1px solid rgba(255,255,255,0.15)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
                      flexShrink: 0,
                      textTransform: 'uppercase',
                    }}
                  >
                    {shortcut.label}
                  </span>

                  {/* Description */}
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.55)',
                      lineHeight: 1.4,
                    }}
                  >
                    {shortcut.description}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer hint */}
            <div
              style={{
                padding: '0 22px 16px',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '10px',
                  letterSpacing: '0.06em',
                  color: 'rgba(255,255,255,0.2)',
                }}
              >
                Press <span style={{ color: 'var(--accent-gold)' }}>?</span> or <span style={{ color: 'var(--accent-gold)' }}>ESC</span> to close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
