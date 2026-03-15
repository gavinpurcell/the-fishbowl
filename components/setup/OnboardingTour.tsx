'use client';

import { useState, useEffect, useCallback } from 'react';

interface OnboardingTourProps {
  setStep: (step: 'template' | 'configure') => void;
}

interface TourStop {
  targetId: string;
  setupStep: 'template' | 'configure';
  title: string;
  copy: string;
}

const TOUR_STOPS: TourStop[] = [
  {
    targetId: 'section-templates',
    setupStep: 'template',
    title: 'Pick your panel of experts',
    copy: 'Choose a pre-built team of AI experts, or build your own custom panel below. Each expert brings a different perspective to your idea.',
  },
  {
    targetId: 'section-panelists',
    setupStep: 'configure',
    title: 'Customize your panelists',
    copy: 'Edit names, roles, and descriptions to shape each expert\'s personality. The more detail you give, the more distinct their feedback will be.',
  },
  {
    targetId: 'section-idea',
    setupStep: 'configure',
    title: 'Describe what you\'re testing',
    copy: 'Paste your pitch, upload a doc, or just describe your idea in plain language. The panel will discuss whatever you give them.',
  },
  {
    targetId: 'section-api',
    setupStep: 'configure',
    title: 'Connect your AI',
    copy: 'Choose Claude or GPT, paste your API key, and pick a model. Your key stays in your browser — we never store it on a server.',
  },
];

interface TooltipPos {
  top: number;
  left: number;
  arrowLeft: number;
}

const STORAGE_KEY = 'fishbowl_onboarded';

export default function OnboardingTour({ setStep }: OnboardingTourProps) {
  const [visible, setVisible] = useState(false);
  const [stopIndex, setStopIndex] = useState(0);
  const [showFinale, setShowFinale] = useState(false);
  const [tooltipPos, setTooltipPos] = useState<TooltipPos>({ top: 0, left: 0, arrowLeft: 160 });
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const alreadyOnboarded = localStorage.getItem(STORAGE_KEY);
    if (!alreadyOnboarded) {
      setVisible(true);
    }
  }, []);

  const positionTooltip = useCallback((targetId: string) => {
    const el = document.getElementById(targetId);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightRect(el.getBoundingClientRect());

    // Re-read after scroll settles
    setTimeout(() => {
      const rect = el.getBoundingClientRect();
      setHighlightRect(rect);

      const tooltipWidth = 320;
      const gap = 16;
      let left = rect.left + rect.width / 2 - tooltipWidth / 2;
      // Clamp within viewport
      left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));
      const top = rect.top - gap; // will be shifted up by tooltip height via transform
      const arrowLeft = rect.left + rect.width / 2 - left;

      setTooltipPos({ top, left, arrowLeft });
    }, 350);
  }, []);

  useEffect(() => {
    if (!visible || showFinale) return;
    const stop = TOUR_STOPS[stopIndex];
    if (!stop) return;
    positionTooltip(stop.targetId);
  }, [visible, stopIndex, showFinale, positionTooltip]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
    setHighlightRect(null);
    // Reset setup page back to template selection step
    setStep('template');
  };

  const handleNext = () => {
    if (stopIndex >= TOUR_STOPS.length - 1) {
      setShowFinale(true);
      setHighlightRect(null);
      return;
    }

    const nextIndex = stopIndex + 1;
    const nextStop = TOUR_STOPS[nextIndex];

    // If next stop requires a different setup step, switch it first then wait for DOM
    if (nextStop.setupStep !== TOUR_STOPS[stopIndex].setupStep) {
      setStep(nextStop.setupStep);
      setTimeout(() => {
        setStopIndex(nextIndex);
      }, 300);
    } else {
      setStopIndex(nextIndex);
    }
  };

  if (!visible) return null;

  const currentStop = TOUR_STOPS[stopIndex];

  return (
    <>
      {/* Transparent click-catcher (no darkening) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          pointerEvents: showFinale ? 'none' : 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Highlight ring on target element */}
      {highlightRect && !showFinale && (
        <div
          style={{
            position: 'fixed',
            top: highlightRect.top - 4,
            left: highlightRect.left - 4,
            width: highlightRect.width + 8,
            height: highlightRect.height + 8,
            boxShadow: '0 0 0 4px var(--accent-gold)',
            borderRadius: '12px',
            zIndex: 42,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Tooltip */}
      {!showFinale && (
        <div
          style={{
            position: 'fixed',
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: 320,
            transform: 'translateY(-100%)',
            zIndex: 50,
            filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.35))',
          }}
        >
          <div
            style={{
              background: 'var(--text-primary)',
              color: 'var(--bg-deep)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            {/* Title */}
            <p style={{ fontWeight: 600, fontSize: '0.875rem', marginBottom: '6px' }}>
              {currentStop.title}
            </p>
            {/* Description */}
            <p style={{ fontSize: '0.75rem', color: '#b0a89e', lineHeight: 1.5, marginBottom: '14px' }}>
              {currentStop.copy}
            </p>
            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                className="label-mono"
                style={{ color: '#b0a89e', flexShrink: 0 }}
              >
                {stopIndex + 1} / {TOUR_STOPS.length}
              </span>
              <div style={{ flex: 1 }} />
              <button
                onClick={dismiss}
                style={{
                  fontSize: '0.75rem',
                  color: '#b0a89e',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                  flexShrink: 0,
                }}
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  background: 'var(--accent-gold)',
                  color: 'var(--bg-deep)',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '5px 12px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                Next →
              </button>
            </div>
          </div>
          {/* CSS triangle arrow pointing down */}
          <div
            style={{
              position: 'absolute',
              bottom: -8,
              left: Math.max(12, Math.min(tooltipPos.arrowLeft - 8, 296)),
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid var(--text-primary)',
            }}
          />
        </div>
      )}

      {/* Finale card */}
      {showFinale && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, var(--accent-warm), var(--accent-gold))',
              borderRadius: '16px',
              padding: '40px 48px',
              maxWidth: '400px',
              textAlign: 'center',
              color: '#ffffff',
              pointerEvents: 'auto',
              filter: 'drop-shadow(0 16px 40px rgba(0,0,0,0.4))',
            }}
          >
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px' }}>
              Ready to focus group your stuff!
            </h2>
            <p style={{ fontSize: '0.9rem', opacity: 0.9, lineHeight: 1.6, marginBottom: '28px' }}>
              Set up your panel and hit "Start the Fishbowl" when you're ready.
            </p>
            <button
              onClick={dismiss}
              style={{
                background: '#ffffff',
                color: 'var(--accent-warm)',
                fontWeight: 700,
                fontSize: '0.9rem',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 32px',
                cursor: 'pointer',
              }}
            >
              Let's Go!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
