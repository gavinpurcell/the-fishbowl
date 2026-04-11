'use client';

import { useEffect, useRef, useState } from 'react';

interface WrapUpOverlayProps {
  panelists: Array<{ id: string; name: string; role: string; color: string }>;
  /** Duration of the session in milliseconds */
  sessionDurationMs: number;
  /** Number of moderation questions asked */
  questionsAsked: number;
  /** Total transcript entries (panelist responses) */
  totalResponses: number;
  /** Called when summary generation should begin (overlay is ready to wait) */
  onStartSummary: () => void;
  /** Set to true externally when summary is ready — triggers final fade and navigation */
  summaryReady: boolean;
  /** Called after the overlay finishes — navigate to results */
  onComplete: () => void;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export default function WrapUpOverlay({
  panelists,
  sessionDurationMs,
  questionsAsked,
  totalResponses,
  onStartSummary,
  summaryReady,
  onComplete,
}: WrapUpOverlayProps) {
  const [phase, setPhase] = useState<'dimming' | 'title' | 'stats' | 'compiling' | 'done'>('dimming');
  const summaryStartedRef = useRef(false);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phase choreography — driven by timers like TransitionOverlay
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    // 0ms: overlay appears (dimming)
    // 400ms: title appears
    timers.push(setTimeout(() => setPhase('title'), 400));
    // 1200ms: stats cascade in
    timers.push(setTimeout(() => setPhase('stats'), 1200));
    // 2800ms: compiling phase — also triggers summary generation
    timers.push(setTimeout(() => setPhase('compiling'), 2800));

    return () => timers.forEach(clearTimeout);
  }, []);

  // Reset summaryStartedRef on mount so re-renders in a new session work correctly
  useEffect(() => {
    summaryStartedRef.current = false;
  }, []);

  // Trigger summary generation when compiling phase begins
  useEffect(() => {
    if (phase === 'compiling' && !summaryStartedRef.current) {
      summaryStartedRef.current = true;
      onStartSummary();
    }
  }, [phase, onStartSummary]);

  // When summary is ready, transition to done and then navigate
  useEffect(() => {
    if (summaryReady && phase === 'compiling') {
      // Brief pause so user sees the completion
      completeTimerRef.current = setTimeout(() => {
        setPhase('done');
      }, 600);
    }

    return () => {
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
    };
  }, [summaryReady, phase]);

  // When done phase triggers, wait for fade-out then navigate
  useEffect(() => {
    if (phase === 'done') {
      const timer = setTimeout(() => {
        onComplete();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [phase, onComplete]);

  const stats = [
    { label: 'DURATION', value: formatDuration(sessionDurationMs) },
    { label: 'PANELISTS', value: String(panelists.length) },
    { label: 'QUESTIONS', value: String(questionsAsked) },
    { label: 'RESPONSES', value: String(totalResponses) },
  ];

  return (
    <>
      <style>{`
        /* ============================================================ */
        /*  Film grain — matches TransitionOverlay                      */
        /* ============================================================ */
        @keyframes wrapGrainDrift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2%, 3%); }
          50% { transform: translate(3%, -1%); }
          75% { transform: translate(-1%, -2%); }
        }

        /* ============================================================ */
        /*  Overlay fade in                                             */
        /* ============================================================ */
        @keyframes wrapOverlayIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }

        @keyframes wrapOverlayOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        /* ============================================================ */
        /*  Title — SESSION COMPLETE                                    */
        /* ============================================================ */
        @keyframes wrapTitleIn {
          0% {
            opacity: 0;
            letter-spacing: 0.4em;
            filter: blur(4px);
          }
          60% {
            opacity: 1;
            letter-spacing: 0.18em;
            filter: blur(0px);
          }
          100% {
            opacity: 1;
            letter-spacing: 0.15em;
            filter: blur(0px);
          }
        }

        @keyframes wrapTitleGlow {
          0%, 100% {
            text-shadow: 0 0 20px rgba(196, 154, 42, 0.3), 0 0 60px rgba(196, 154, 42, 0.1);
          }
          50% {
            text-shadow: 0 0 30px rgba(196, 154, 42, 0.5), 0 0 80px rgba(196, 154, 42, 0.2);
          }
        }

        /* ============================================================ */
        /*  Horizontal rules                                            */
        /* ============================================================ */
        @keyframes wrapHrSweep {
          0% { width: 0; opacity: 0; }
          100% { width: min(400px, 70vw); opacity: 1; }
        }

        /* ============================================================ */
        /*  Stats cascade                                               */
        /* ============================================================ */
        @keyframes wrapStatIn {
          0% {
            opacity: 0;
            transform: translateY(12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ============================================================ */
        /*  Compiling dots                                              */
        /* ============================================================ */
        @keyframes wrapDotsLoop {
          0% { content: ''; }
          25% { content: '.'; }
          50% { content: '..'; }
          75% { content: '...'; }
          100% { content: ''; }
        }

        @keyframes wrapPulseBar {
          0%, 100% { opacity: 0.3; transform: scaleX(0.6); }
          50% { opacity: 1; transform: scaleX(1); }
        }

        @keyframes wrapCompilingIn {
          0% { opacity: 0; transform: translateY(8px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        /* ============================================================ */
        /*  Scanline sweep — matches TransitionOverlay                  */
        /* ============================================================ */
        @keyframes wrapScanlineMove {
          0% { top: -2px; }
          100% { top: 100%; }
        }

        /* ============================================================ */
        /*  Checkmark appear                                            */
        /* ============================================================ */
        @keyframes wrapCheckIn {
          0% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.15); }
          100% { opacity: 1; transform: scale(1); }
        }

        /* ============================================================ */
        /*  Container                                                   */
        /* ============================================================ */
        .wrap-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgba(13, 11, 9, 0.0);
          animation: wrapOverlayIn 500ms ease-out forwards;
          overflow: hidden;
        }

        .wrap-overlay.phase-dimming {
          background: rgba(13, 11, 9, 0.0);
          animation: wrapOverlayIn 500ms ease-out forwards;
        }

        .wrap-overlay.phase-done {
          animation: wrapOverlayOut 700ms ease-in forwards;
        }

        /* Film grain layer */
        .wrap-overlay::before {
          content: '';
          position: absolute;
          inset: -20%;
          z-index: 1;
          opacity: 0.05;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 256px;
          animation: wrapGrainDrift 0.8s steps(4) infinite;
        }

        /* Scanline sweep */
        .wrap-overlay::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          z-index: 2;
          background: linear-gradient(90deg, transparent, rgba(196, 154, 42, 0.12), transparent);
          animation: wrapScanlineMove 2.5s linear infinite;
          pointer-events: none;
        }

        .wrap-content {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          gap: 0;
        }

        /* ============================================================ */
        /*  Title                                                       */
        /* ============================================================ */
        .wrap-title {
          font-family: 'Silkscreen', 'Courier New', monospace;
          font-size: clamp(1.2rem, 3.5vw, 2rem);
          color: var(--accent-gold, #c49a2a);
          letter-spacing: 0.3em;
          text-transform: uppercase;
          opacity: 0;
          margin-bottom: 24px;
        }

        .wrap-title.visible {
          animation: wrapTitleIn 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards,
                     wrapTitleGlow 2s ease-in-out 700ms infinite;
        }

        /* ============================================================ */
        /*  HR                                                          */
        /* ============================================================ */
        .wrap-hr {
          height: 1px;
          width: 0;
          opacity: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--accent-gold, #c49a2a) 20%,
            var(--accent-gold-light, #f0c866) 50%,
            var(--accent-gold, #c49a2a) 80%,
            transparent 100%
          );
          margin-bottom: 28px;
        }

        .wrap-hr.visible {
          animation: wrapHrSweep 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .wrap-hr-bottom {
          height: 1px;
          width: 0;
          opacity: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            var(--accent-gold, #c49a2a) 20%,
            var(--accent-gold-light, #f0c866) 50%,
            var(--accent-gold, #c49a2a) 80%,
            transparent 100%
          );
          margin-top: 28px;
        }

        .wrap-hr-bottom.visible {
          animation: wrapHrSweep 600ms cubic-bezier(0.22, 1, 0.36, 1) 200ms forwards;
        }

        /* ============================================================ */
        /*  Stats grid                                                  */
        /* ============================================================ */
        .wrap-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          width: min(500px, 85vw);
          opacity: 0;
        }

        .wrap-stats.visible {
          opacity: 1;
        }

        .wrap-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          opacity: 0;
        }

        .wrap-stat.visible {
          animation: wrapStatIn 500ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .wrap-stat-value {
          font-family: 'Silkscreen', 'Courier New', monospace;
          font-size: clamp(1rem, 2.5vw, 1.5rem);
          color: var(--accent-gold-light, #f0c866);
          letter-spacing: 0.06em;
        }

        .wrap-stat-label {
          font-family: 'DM Mono', monospace;
          font-size: clamp(0.5rem, 1.2vw, 0.65rem);
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(212, 205, 194, 0.4);
        }

        /* ============================================================ */
        /*  Compiling indicator                                         */
        /* ============================================================ */
        .wrap-compiling {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          opacity: 0;
          margin-top: 32px;
        }

        .wrap-compiling.visible {
          animation: wrapCompilingIn 500ms ease-out forwards;
        }

        .wrap-compiling-text {
          font-family: 'DM Mono', monospace;
          font-size: clamp(0.65rem, 1.4vw, 0.8rem);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(212, 205, 194, 0.5);
        }

        .wrap-compiling-bar {
          width: min(200px, 50vw);
          height: 2px;
          background: rgba(196, 154, 42, 0.15);
          border-radius: 1px;
          overflow: hidden;
          position: relative;
        }

        .wrap-compiling-bar-fill {
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, transparent, var(--accent-gold, #c49a2a), transparent);
          animation: wrapPulseBar 1.5s ease-in-out infinite;
          transform-origin: center;
        }

        .wrap-compiling-check {
          display: flex;
          align-items: center;
          gap: 8px;
          opacity: 0;
        }

        .wrap-compiling-check.visible {
          animation: wrapCheckIn 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .wrap-compiling-check-icon {
          color: var(--accent-gold, #c49a2a);
          font-size: 1rem;
        }

        .wrap-compiling-check-text {
          font-family: 'DM Mono', monospace;
          font-size: clamp(0.65rem, 1.4vw, 0.8rem);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent-gold, #c49a2a);
        }

        /* ============================================================ */
        /*  Panelist sign-off row                                       */
        /* ============================================================ */
        .wrap-panelist-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 4px;
          opacity: 0;
        }

        .wrap-panelist-row.visible {
          animation: wrapStatIn 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .wrap-panelist-pip {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          opacity: 0.7;
        }

        @media (max-width: 480px) {
          .wrap-stats {
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
          }
        }
      `}</style>

      <div className={`wrap-overlay phase-${phase}`}
        role="status"
        aria-live="assertive"
        aria-label="Session complete, compiling report"
        style={{
          background: phase === 'done' ? 'var(--dark-deep, #0d0b09)' : 'var(--dark-deep, #0d0b09)',
        }}
      >
        <div className="wrap-content">
          {/* Title — SESSION COMPLETE */}
          <div className={`wrap-title ${phase !== 'dimming' ? 'visible' : ''}`}>
            THAT&apos;S A WRAP
          </div>

          {/* Top HR */}
          <div className={`wrap-hr ${phase === 'stats' || phase === 'compiling' || phase === 'done' ? 'visible' : ''}`} />

          {/* Stats grid */}
          <div className={`wrap-stats ${phase === 'stats' || phase === 'compiling' || phase === 'done' ? 'visible' : ''}`}>
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`wrap-stat ${phase === 'stats' || phase === 'compiling' || phase === 'done' ? 'visible' : ''}`}
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <span className="wrap-stat-value">{stat.value}</span>
                <span className="wrap-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Panelist color pips */}
          <div
            className={`wrap-panelist-row ${phase === 'stats' || phase === 'compiling' || phase === 'done' ? 'visible' : ''}`}
            style={{ animationDelay: '500ms', marginTop: '20px' }}
          >
            {panelists.map((p) => (
              <div
                key={p.id}
                className="wrap-panelist-pip"
                style={{ background: p.color }}
                title={p.name}
              />
            ))}
          </div>

          {/* Bottom HR */}
          <div className={`wrap-hr-bottom ${phase === 'stats' || phase === 'compiling' || phase === 'done' ? 'visible' : ''}`} />

          {/* Compiling indicator */}
          <div className={`wrap-compiling ${phase === 'compiling' || phase === 'done' ? 'visible' : ''}`}>
            {summaryReady ? (
              <div className={`wrap-compiling-check ${summaryReady ? 'visible' : ''}`}>
                <svg className="wrap-compiling-check-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="wrap-compiling-check-text">REPORT READY</span>
              </div>
            ) : (
              <>
                <span className="wrap-compiling-text">COMPILING REPORT</span>
                <div className="wrap-compiling-bar">
                  <div className="wrap-compiling-bar-fill" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
