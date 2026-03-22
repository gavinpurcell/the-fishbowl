'use client';

import { useEffect, useRef } from 'react';

interface TransitionOverlayProps {
  panelists: Array<{ id: string; name: string; color: string }>;
  onComplete: () => void;
}

export default function TransitionOverlay({ panelists, onComplete }: TransitionOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onComplete]);

  return (
    <>
      <style>{`
        @keyframes transitionOverlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes transitionOverlayFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes transitionLineExpand {
          from {
            width: 0;
            opacity: 0;
          }
          to {
            width: min(320px, 60vw);
            opacity: 1;
          }
        }

        @keyframes transitionTextReveal {
          from {
            opacity: 0;
            transform: scale(0.92) translateY(8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes transitionSubtitleReveal {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 0.7;
            transform: translateY(0);
          }
        }

        @keyframes transitionDotAppear {
          from {
            opacity: 0;
            transform: scale(0) translateY(4px);
          }
          60% {
            transform: scale(1.2) translateY(0);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        @keyframes transitionDotPulse {
          0%, 100% {
            box-shadow: 0 0 0 0 var(--dot-color);
          }
          50% {
            box-shadow: 0 0 12px 3px var(--dot-color);
          }
        }

        .transition-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(20, 12, 8, 0.85);
          animation:
            transitionOverlayFadeIn 300ms ease-out forwards,
            transitionOverlayFadeOut 500ms ease-in 2500ms forwards;
          font-family: 'Outfit', system-ui, sans-serif;
        }

        .transition-gold-line {
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--accent-gold, #c49a2a) 20%,
            #f0c866 50%,
            var(--accent-gold, #c49a2a) 80%,
            transparent 100%
          );
          opacity: 0;
          animation: transitionLineExpand 600ms cubic-bezier(0.22, 1, 0.36, 1) 200ms forwards;
          margin-bottom: 32px;
        }

        .transition-heading {
          font-family: 'Silkscreen', 'Courier New', monospace;
          font-size: clamp(1.5rem, 3.5vw, 2.25rem);
          font-weight: 400;
          color: #faf6ef;
          letter-spacing: 0.02em;
          opacity: 0;
          animation: transitionTextReveal 600ms cubic-bezier(0.22, 1, 0.36, 1) 400ms forwards;
          margin: 0;
          text-align: center;
          padding: 0 24px;
        }

        .transition-subtitle {
          font-size: clamp(0.85rem, 1.5vw, 1rem);
          font-weight: 300;
          color: #d4cdc2;
          letter-spacing: 0.04em;
          opacity: 0;
          animation: transitionSubtitleReveal 500ms ease-out 600ms forwards;
          margin: 12px 0 0 0;
          text-align: center;
          padding: 0 24px;
        }

        .transition-dots {
          display: flex;
          gap: 16px;
          margin-top: 36px;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          padding: 0 24px;
        }

        .transition-dot-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          opacity: 0;
          animation: transitionDotAppear 400ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .transition-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          animation: transitionDotPulse 2s ease-in-out infinite;
        }

        .transition-dot-name {
          font-family: 'DM Mono', monospace;
          font-size: 0.6rem;
          font-weight: 400;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(212, 205, 194, 0.6);
          white-space: nowrap;
        }

        .transition-gold-line-bottom {
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--accent-gold, #c49a2a) 20%,
            #f0c866 50%,
            var(--accent-gold, #c49a2a) 80%,
            transparent 100%
          );
          opacity: 0;
          animation: transitionLineExpand 600ms cubic-bezier(0.22, 1, 0.36, 1) 200ms forwards;
          margin-top: 32px;
        }
      `}</style>

      <div className="transition-overlay">
        <div className="transition-gold-line" />

        <h2 className="transition-heading">The Discussion Begins</h2>
        <p className="transition-subtitle">Your panel will now debate with each other</p>

        <div className="transition-dots">
          {panelists.map((panelist, index) => (
            <div
              key={panelist.id}
              className="transition-dot-item"
              style={{
                animationDelay: `${800 + index * 100}ms`,
              }}
            >
              <div
                className="transition-dot"
                style={{
                  backgroundColor: panelist.color,
                  ['--dot-color' as string]: `${panelist.color}66`,
                  animationDelay: `${800 + index * 100 + 200}ms`,
                }}
              />
              <span className="transition-dot-name">{panelist.name}</span>
            </div>
          ))}
        </div>

        <div className="transition-gold-line-bottom" />
      </div>
    </>
  );
}
