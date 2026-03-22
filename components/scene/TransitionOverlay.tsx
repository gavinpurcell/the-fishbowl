'use client';

import { useEffect, useRef } from 'react';

interface TransitionOverlayProps {
  panelists: Array<{ id: string; name: string; role: string; color: string }>;
  onComplete: () => void;
}

export default function TransitionOverlay({ panelists, onComplete }: TransitionOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Single JS timer for onComplete — all visual choreography is pure CSS
    timerRef.current = setTimeout(() => {
      onComplete();
    }, 4500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onComplete]);

  return (
    <>
      <style>{`
        /* ============================================================ */
        /*  Film grain noise texture via SVG filter                     */
        /* ============================================================ */
        @keyframes grainDrift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2%, 3%); }
          50% { transform: translate(3%, -1%); }
          75% { transform: translate(-1%, -2%); }
        }

        /* ============================================================ */
        /*  STANDBY text                                                */
        /* ============================================================ */
        @keyframes standbyIn {
          0% { opacity: 0; letter-spacing: 0.4em; }
          30% { opacity: 1; letter-spacing: 0.2em; }
          70% { opacity: 1; letter-spacing: 0.2em; }
          100% { opacity: 0; letter-spacing: 0.1em; }
        }

        /* ============================================================ */
        /*  Panelist name cascade                                       */
        /* ============================================================ */
        @keyframes panelistSlideIn {
          0% {
            opacity: 0;
            transform: translateX(-24px);
          }
          20% {
            opacity: 1;
            transform: translateX(0);
          }
          75% {
            opacity: 1;
            transform: translateX(0);
          }
          100% {
            opacity: 0;
            transform: translateX(8px);
          }
        }

        @keyframes panelistBarExpand {
          0% { width: 0; }
          20% { width: 100%; }
          75% { width: 100%; }
          100% { width: 0; }
        }

        /* ============================================================ */
        /*  LIVE punch-in                                               */
        /* ============================================================ */
        @keyframes livePunchIn {
          0% {
            opacity: 0;
            transform: scale(2.5);
            filter: blur(8px);
          }
          40% {
            opacity: 1;
            transform: scale(0.95);
            filter: blur(0px);
          }
          55% {
            transform: scale(1.02);
          }
          70% {
            transform: scale(1);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes liveGlow {
          0%, 100% {
            text-shadow: 0 0 20px rgba(232, 90, 74, 0.4), 0 0 60px rgba(232, 90, 74, 0.15);
          }
          50% {
            text-shadow: 0 0 30px rgba(232, 90, 74, 0.6), 0 0 80px rgba(232, 90, 74, 0.25);
          }
        }

        @keyframes recDotPulse {
          0%, 100% {
            opacity: 1;
            box-shadow: 0 0 6px rgba(232, 90, 74, 0.6);
          }
          50% {
            opacity: 0.4;
            box-shadow: 0 0 12px rgba(232, 90, 74, 0.9);
          }
        }

        @keyframes scanlineMove {
          0% { top: -2px; }
          100% { top: 100%; }
        }

        /* ============================================================ */
        /*  Full overlay fade out                                       */
        /* ============================================================ */
        @keyframes overlayFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* ============================================================ */
        /*  Horizontal rule sweep                                       */
        /* ============================================================ */
        @keyframes hrSweep {
          0% { width: 0; opacity: 0; }
          50% { width: min(400px, 70vw); opacity: 1; }
          85% { width: min(400px, 70vw); opacity: 1; }
          100% { width: 0; opacity: 0; }
        }

        /* ============================================================ */
        /*  Overlay container                                           */
        /* ============================================================ */
        .broadcast-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--dark-deep);
          animation: overlayFadeOut 500ms ease-in 4000ms forwards;
          overflow: hidden;
        }

        /* Film grain layer */
        .broadcast-overlay::before {
          content: '';
          position: absolute;
          inset: -20%;
          z-index: 1;
          opacity: 0.06;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 256px;
          animation: grainDrift 0.8s steps(4) infinite;
        }

        /* Scanline sweep */
        .broadcast-overlay::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          z-index: 2;
          background: linear-gradient(90deg, transparent, rgba(196, 154, 42, 0.15), transparent);
          animation: scanlineMove 2s linear infinite;
          pointer-events: none;
        }

        /* All inner content above grain */
        .broadcast-content {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        /* ============================================================ */
        /*  STANDBY                                                     */
        /* ============================================================ */
        .broadcast-standby {
          font-family: 'Silkscreen', 'Courier New', monospace;
          font-size: clamp(0.9rem, 2.5vw, 1.4rem);
          color: var(--accent-gold);
          letter-spacing: 0.3em;
          text-transform: uppercase;
          opacity: 0;
          animation: standbyIn 900ms ease-out 200ms forwards;
          position: absolute;
        }

        /* ============================================================ */
        /*  Panelist lineup                                             */
        /* ============================================================ */
        .broadcast-lineup {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: min(460px, 85vw);
          opacity: 0;
          animation: panelistSlideIn 1800ms cubic-bezier(0.22, 1, 0.36, 1) 1000ms forwards;
        }

        .broadcast-panelist {
          display: flex;
          align-items: center;
          gap: 12px;
          opacity: 0;
          padding: 6px 0;
        }

        .broadcast-panelist-bar {
          width: 0;
          height: 2px;
          flex-shrink: 0;
        }

        .broadcast-panelist-name {
          font-family: 'Silkscreen', 'Courier New', monospace;
          font-size: clamp(0.85rem, 2vw, 1.15rem);
          white-space: nowrap;
          letter-spacing: 0.04em;
        }

        .broadcast-panelist-role {
          font-family: 'DM Mono', monospace;
          font-size: clamp(0.55rem, 1.2vw, 0.7rem);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(212, 205, 194, 0.5);
          white-space: nowrap;
        }

        .broadcast-panelist-divider {
          font-family: 'DM Mono', monospace;
          font-size: 0.6rem;
          color: rgba(212, 205, 194, 0.2);
          flex-shrink: 0;
        }

        /* ============================================================ */
        /*  Horizontal rule                                             */
        /* ============================================================ */
        .broadcast-hr {
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--accent-gold, #c49a2a) 20%,
            var(--accent-gold-light) 50%,
            var(--accent-gold, #c49a2a) 80%,
            transparent 100%
          );
          animation: hrSweep 2000ms cubic-bezier(0.22, 1, 0.36, 1) 900ms forwards;
          margin-bottom: 20px;
          opacity: 0;
        }

        .broadcast-hr-bottom {
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--accent-gold, #c49a2a) 20%,
            var(--accent-gold-light) 50%,
            var(--accent-gold, #c49a2a) 80%,
            transparent 100%
          );
          animation: hrSweep 2000ms cubic-bezier(0.22, 1, 0.36, 1) 900ms forwards;
          margin-top: 20px;
          opacity: 0;
        }

        /* ============================================================ */
        /*  LIVE badge                                                  */
        /* ============================================================ */
        .broadcast-live-container {
          display: flex;
          align-items: center;
          gap: 14px;
          opacity: 0;
          position: absolute;
          animation: livePunchIn 600ms cubic-bezier(0.16, 1, 0.3, 1) 2700ms forwards;
        }

        .broadcast-live-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: var(--accent-red);
          flex-shrink: 0;
          animation: recDotPulse 1s ease-in-out infinite;
          animation-delay: 2700ms;
        }

        .broadcast-live-text {
          font-family: 'Silkscreen', 'Courier New', monospace;
          font-size: clamp(2rem, 6vw, 3.5rem);
          color: var(--bg-deep);
          letter-spacing: 0.15em;
          animation: liveGlow 1.5s ease-in-out infinite;
          animation-delay: 3000ms;
        }
      `}</style>

      <div className="broadcast-overlay">
        <div className="broadcast-content">
          {/* Phase 1: STANDBY — 0.2s to 1.1s */}
          <div className="broadcast-standby">STANDBY</div>

          {/* Phase 2: Panelist lineup — 1.0s to 2.6s */}
          <div className="broadcast-hr" />

          <div className="broadcast-lineup">
            {panelists.map((panelist, index) => (
              <div
                key={panelist.id}
                className="broadcast-panelist"
                style={{
                  animation: `panelistSlideIn 1500ms cubic-bezier(0.22, 1, 0.36, 1) ${1000 + index * 200}ms forwards`,
                }}
              >
                <div
                  className="broadcast-panelist-bar"
                  style={{
                    background: panelist.color,
                    animation: `panelistBarExpand 1500ms cubic-bezier(0.22, 1, 0.36, 1) ${1000 + index * 200}ms forwards`,
                    minWidth: '24px',
                  }}
                />
                <span
                  className="broadcast-panelist-name"
                  style={{ color: panelist.color }}
                >
                  {panelist.name}
                </span>
                <span className="broadcast-panelist-divider">//</span>
                <span className="broadcast-panelist-role">{panelist.role}</span>
              </div>
            ))}
          </div>

          <div className="broadcast-hr-bottom" />

          {/* Phase 3: LIVE punch-in — 2.7s to 3.5s */}
          <div className="broadcast-live-container">
            <div className="broadcast-live-dot" />
            <span className="broadcast-live-text">LIVE</span>
          </div>
        </div>
      </div>
    </>
  );
}
