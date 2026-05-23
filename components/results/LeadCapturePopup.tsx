'use client';

import { useState, useEffect } from 'react';

interface Props {
  onDismiss: () => void;
  ideaText?: string;
}

const STORAGE_KEY = 'fishbowl-lead-shown';

export default function LeadCapturePopup({ onDismiss, ideaText }: Props) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [visible, setVisible] = useState(false);

  // Fade in on mount
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Don't show if already shown
  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) {
      onDismiss();
    }
  }, [onDismiss]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Send to backend (Redis) — fire and don't block on failure
    try {
      await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), ideaText }),
      });
    } catch {
      // API unavailable — proceed anyway
    }

    localStorage.setItem(STORAGE_KEY, 'true');
    setSubmitted(true);
    setTimeout(() => {
      onDismiss();
    }, 1500);
  };

  const handleSkip = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    onDismiss();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        style={{
          maxWidth: '440px',
          width: '100%',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Gold accent top line */}
        <div
          style={{
            height: '2px',
            background: 'var(--accent-gold)',
          }}
        />

        <div style={{ padding: '32px 28px 28px' }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div
                className="font-pixel"
                style={{
                  fontSize: '14px',
                  color: 'var(--accent-gold)',
                  letterSpacing: '0.04em',
                  marginBottom: '8px',
                }}
              >
                THANKS
              </div>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                }}
              >
                I&apos;ll be in touch.
              </p>
            </div>
          ) : (
            <>
              <h2
                className="font-pixel"
                style={{
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  letterSpacing: '0.03em',
                  marginBottom: '12px',
                  lineHeight: 1.3,
                }}
              >
                I build AI experiences like this.
              </h2>
              <p
                style={{
                  fontFamily: "'Outfit', sans-serif",
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                  marginBottom: '24px',
                }}
              >
                I help companies and teams see how AI actually works and get the most out of it. If what you just experienced was interesting, let&apos;s talk.
              </p>

              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    fontFamily: "'DM Mono', monospace",
                    fontSize: '13px',
                    color: 'var(--text-primary)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    outline: 'none',
                    marginBottom: '12px',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="submit"
                  className="cta-game-button"
                  style={{
                    width: '100%',
                    fontSize: '12px',
                    letterSpacing: '0.06em',
                    padding: '12px',
                  }}
                >
                  Get in Touch
                </button>
              </form>

              <button
                onClick={handleSkip}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: '14px',
                  padding: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: "'DM Mono', monospace",
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                }}
              >
                Just Give Me The Results
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
