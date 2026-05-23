'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface IntroOverlayProps {
  topic: string;
  panelists: Array<{ id: string; name: string; role: string; color: string; spriteIndex: number; description: string }>;
  onComplete: () => void;
  /** When true, at least one initial take is ready — safe to proceed */
  ready?: boolean;
}

export default function IntroOverlay({ topic, panelists, onComplete, ready = false }: IntroOverlayProps) {
  const hasCompletedRef = useRef(false);
  const [isDone, setIsDone] = useState(false);
  const [phase, setPhase] = useState<'topic' | 'panel' | 'ready'>('topic');
  const minTimeRef = useRef(false);

  // Phase timeline
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('panel'), 2200);
    const t2 = setTimeout(() => {
      minTimeRef.current = true;
      setPhase('ready');
    }, 4500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Complete when ready + min time passed
  useEffect(() => {
    if (phase === 'ready' && ready && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- triggers fade-out animation
      setIsDone(true);
      // Small delay for the "ready" state to render
      setTimeout(onComplete, 800);
    }
  }, [phase, ready, onComplete]);

  // Also poll if ready arrives after phase change
  useEffect(() => {
    if (!ready || hasCompletedRef.current) return;
    if (minTimeRef.current) {
      hasCompletedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- triggers fade-out animation
      setIsDone(true);
      setTimeout(onComplete, 800);
    }
  }, [ready, onComplete]);

  return (
    <>
      <style>{`
        @keyframes introFadeIn {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes introFadeOut {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }

        @keyframes introTopicIn {
          0% { opacity: 0; transform: scale(0.85); filter: blur(6px); }
          100% { opacity: 1; transform: scale(1); filter: blur(0); }
        }

        @keyframes introPanelistIn {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }

        @keyframes introLabelIn {
          0% { opacity: 0; letter-spacing: 0.5em; }
          100% { opacity: 1; letter-spacing: 0.2em; }
        }

        @keyframes introPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        @keyframes introGrainDrift {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2%, 3%); }
          50% { transform: translate(3%, -1%); }
          75% { transform: translate(-1%, -2%); }
        }

        @keyframes introScanline {
          0% { top: -2px; }
          100% { top: 100%; }
        }

        .intro-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: var(--dark-deep);
          overflow: hidden;
        }

        .intro-overlay.is-done {
          animation: introFadeOut 600ms ease-in forwards;
        }

        .intro-overlay::before {
          content: '';
          position: absolute;
          inset: -20%;
          z-index: 1;
          opacity: 0.05;
          pointer-events: none;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-repeat: repeat;
          background-size: 256px;
          animation: introGrainDrift 0.8s steps(4) infinite;
        }

        .intro-overlay::after {
          content: '';
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          z-index: 2;
          background: linear-gradient(90deg, transparent, rgba(196, 154, 42, 0.12), transparent);
          animation: introScanline 2.5s linear infinite;
          pointer-events: none;
        }

        .intro-content {
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 700px;
          max-height: 100vh;
          overflow-y: auto;
          padding: 24px;
          gap: 32px;
        }
      `}</style>

      <div
        className={`intro-overlay${isDone ? ' is-done' : ''}`}
        role="status"
        aria-live="assertive"
        aria-label="Session briefing"
      >
        <div className="intro-content">
          {/* Label */}
          <div
            style={{
              fontFamily: "'Silkscreen', 'Courier New', monospace",
              fontSize: 'clamp(0.6rem, 1.5vw, 0.8rem)',
              color: 'var(--accent-gold)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              opacity: 0,
              animation: 'introLabelIn 600ms ease-out 200ms forwards',
            }}
          >
            Mission Briefing
          </div>

          {/* Topic — big and bold */}
          {(phase === 'topic' || phase === 'panel' || phase === 'ready') && (
            <div
              style={{
                fontFamily: "'Outfit', sans-serif",
                fontSize: 'clamp(1rem, 3.5vw, 2.4rem)',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.9)',
                textAlign: 'center',
                lineHeight: 1.3,
                maxWidth: '600px',
                wordBreak: 'break-word' as const,
                overflowWrap: 'break-word' as const,
                padding: '0 12px',
                opacity: 0,
                animation: 'introTopicIn 800ms cubic-bezier(0.22, 1, 0.36, 1) 400ms forwards',
              }}
            >
              {topic ? `"${topic}"` : 'Open Discussion'}
            </div>
          )}

          {/* Divider */}
          <div
            style={{
              width: 'min(300px, 60vw)',
              height: '1px',
              background: 'linear-gradient(90deg, transparent, var(--accent-gold), transparent)',
              opacity: 0,
              animation: 'introFadeIn 600ms ease-out 800ms forwards',
            }}
          />

          {/* Panel label */}
          <div
            style={{
              fontFamily: "'Silkscreen', 'Courier New', monospace",
              fontSize: 'clamp(0.55rem, 1.2vw, 0.7rem)',
              color: 'rgba(255, 255, 255, 0.3)',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              opacity: 0,
              animation: 'introFadeIn 500ms ease-out 1200ms forwards',
            }}
          >
            Your Panel
          </div>

          {/* Panelist specimen cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '460px' }}>
            {panelists.map((p, i) => (
              <div
                key={p.id}
                style={{
                  opacity: 0,
                  animation: `introPanelistIn 500ms ease-out ${1400 + i * 150}ms forwards`,
                }}
              >
                <div
                  className="specimen-card"
                  style={{ ['--brass-accent' as string]: p.color }}
                >
                  <div className="brass-plate">
                    <div className="brass-screw" />
                    <span className="brass-label">
                      <span className="sm:hidden">IN THE FISHBOWL · {String(i + 1).padStart(2, '0')}</span>
                      <span className="hidden sm:inline">NOW IN THE FISHBOWL · {String(i + 1).padStart(2, '0')} / {String(panelists.length).padStart(2, '0')}</span>
                    </span>
                    <span className="brass-marker" style={{ color: p.color }}>LIVE</span>
                    <div className="brass-screw" />
                  </div>
                  <div className="p-4">
                    <div className="flex gap-3 items-center">
                      <div className="pixel-frame">
                        <Image
                          src={`/sprites/portraits/char_${p.spriteIndex}_portrait.png`}
                          alt={p.name}
                          width={72}
                          height={72}
                          style={{ imageRendering: 'pixelated', display: 'block' }}
                        />
                      </div>
                      <div className="flex-1">
                        <div
                          style={{
                            color: 'var(--text-primary)',
                            fontFamily: "'Silkscreen', monospace",
                            fontSize: '16px',
                          }}
                        >
                          {p.name}
                        </div>
                        <div
                          style={{
                            color: p.color,
                            fontFamily: "'DM Mono', monospace",
                            fontSize: '10px',
                            letterSpacing: '0.16em',
                            textTransform: 'uppercase',
                            marginTop: '4px',
                          }}
                        >
                          {p.role}
                        </div>
                        <p
                          className="mt-2 text-xs leading-relaxed"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {p.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Ready indicator */}
          {phase === 'ready' && !ready && (
            <div
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '0.75rem',
                color: 'rgba(196, 154, 42, 0.5)',
                animation: 'introPulse 1.5s ease-in-out infinite',
              }}
            >
              Preparing initial takes...
            </div>
          )}
        </div>
      </div>
    </>
  );
}
