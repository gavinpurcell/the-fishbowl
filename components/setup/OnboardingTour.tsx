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
      // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR: must check localStorage on mount
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

      const tooltipWidth = 340;
      const gap = 18;
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- positions tooltip via DOM measurement
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
      {/* Dark overlay with vignette */}
      <div
        className="tour-overlay"
        style={{
          pointerEvents: showFinale ? 'none' : 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Highlight ring on target element */}
      {highlightRect && !showFinale && (
        <div
          className="tour-highlight"
          style={{
            position: 'fixed',
            top: highlightRect.top - 6,
            left: highlightRect.left - 6,
            width: highlightRect.width + 12,
            height: highlightRect.height + 12,
            zIndex: 42,
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
            width: 340,
            transform: 'translateY(-100%)',
            zIndex: 50,
          }}
        >
          <div className="tour-tooltip">
            {/* Step counter */}
            <div className="tour-step-label">
              <span className="tour-step-icon">{stopIndex + 1}</span>
              Step {stopIndex + 1} of {TOUR_STOPS.length}
            </div>

            {/* Title */}
            <p className="tour-title">
              {currentStop.title}
            </p>

            {/* Description */}
            <p className="tour-desc">
              {currentStop.copy}
            </p>

            {/* Footer */}
            <div className="tour-footer">
              {/* Progress dots */}
              <div className="tour-dots">
                {TOUR_STOPS.map((_, di) => (
                  <div
                    key={di}
                    className={`tour-dot ${di === stopIndex ? 'active' : di < stopIndex ? 'completed' : ''}`}
                  />
                ))}
              </div>

              <div style={{ flex: 1 }} />

              <button
                onClick={dismiss}
                className="tour-btn tour-btn-skip"
              >
                Skip
              </button>
              <button
                onClick={handleNext}
                className="tour-btn tour-btn-next"
              >
                Next
              </button>
            </div>
          </div>

          {/* Arrow pointing down */}
          <div
            className="tour-arrow"
            style={{
              left: Math.max(16, Math.min(tooltipPos.arrowLeft - 8, 312)),
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
            className="tour-finale"
            style={{ pointerEvents: 'auto' }}
          >
            {/* Decorative corner marks */}
            <div style={{
              position: 'absolute',
              top: 8,
              left: 8,
              width: 12,
              height: 12,
              borderTop: '2px solid var(--accent-gold)',
              borderLeft: '2px solid var(--accent-gold)',
              opacity: 0.4,
            }} />
            <div style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 12,
              height: 12,
              borderTop: '2px solid var(--accent-gold)',
              borderRight: '2px solid var(--accent-gold)',
              opacity: 0.4,
            }} />
            <div style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              width: 12,
              height: 12,
              borderBottom: '2px solid var(--accent-gold)',
              borderLeft: '2px solid var(--accent-gold)',
              opacity: 0.4,
            }} />
            <div style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              width: 12,
              height: 12,
              borderBottom: '2px solid var(--accent-gold)',
              borderRight: '2px solid var(--accent-gold)',
              opacity: 0.4,
            }} />

            <div className="tour-step-label" style={{ justifyContent: 'center', marginBottom: 12 }}>
              Tutorial Complete
            </div>
            <h2 className="tour-finale-title">
              Mission Briefing Complete
            </h2>
            <p className="tour-finale-desc">
              Set up your panel and hit &ldquo;Start the Fishbowl&rdquo; when you&apos;re ready to begin.
            </p>
            <button
              onClick={dismiss}
              className="tour-finale-btn"
            >
              Let&apos;s Go
            </button>
          </div>
        </div>
      )}
    </>
  );
}
