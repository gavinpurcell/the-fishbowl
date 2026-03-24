'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TitleScene } from '@/scene/TitleScene';
import { loadAllSprites } from '@/lib/spriteLoader';

const ROSTER_COLORS = ['#4a9e6e', '#c45a5a', '#5a7ec4', '#d4a040', '#9a6ab4'];

export default function TitlePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TitleScene | null>(null);

  useEffect(() => {
    if (!canvasRef.current || sceneRef.current) return;
    const scene = new TitleScene();
    sceneRef.current = scene;
    loadAllSprites().then(() => {
      if (canvasRef.current) scene.init(canvasRef.current);
    });

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        overflow: 'hidden',
      }}
    >
      {/* Ambient gold glow behind scene */}
      <div
        className="fixed top-[30%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
        style={{
          width: '600px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(196,154,42,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Everything packed tight in one column */}
      <div className="flex flex-col items-center w-full relative" style={{ zIndex: 2 }}>

        {/* PixiJS Scene — hero, as large as possible */}
        <div className="relative animate-fade-in w-full max-w-[700px]">
          <div
            ref={canvasRef}
            className="scene-viewport w-full"
            style={{
              aspectRatio: '420 / 280',
              background: 'var(--dark-surface)',
            }}
          />
          <div className="scene-badge">
            <div className="scene-badge-dot" />
            <span
              className="font-pixel"
              style={{ fontSize: '8px', color: 'var(--text-secondary)', letterSpacing: '0.1em' }}
            >
              LIVE
            </span>
          </div>
          {/* Scanlines */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)',
              borderRadius: 'inherit',
            }}
          />
        </div>

        {/* Roster dots */}
        <div className="roster-dots animate-fade-in" style={{ marginTop: '4px' }}>
          {ROSTER_COLORS.map((color, i) => (
            <div
              key={color}
              className="roster-dot"
              style={{ background: color, animationDelay: `${0.6 + i * 0.08}s` }}
            />
          ))}
        </div>

        {/* Title */}
        <h1
          className="title-text animate-title-reveal text-center mt-2"
          style={{ fontSize: 'clamp(1.8rem, 6vw, 3rem)' }}
        >
          THE FISHBOWL
        </h1>

        {/* Tagline */}
        <p
          className="animate-subtitle-reveal mt-1 text-center"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 'clamp(0.6rem, 1.4vw, 0.75rem)',
            letterSpacing: '0.14em',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
          }}
        >
          Your idea. Four AI experts. One honest conversation.
        </p>

        {/* CTA */}
        <button
          onClick={() => router.push('/setup')}
          className="cta-game-button animate-fade-in animate-fade-in-delay-3 mt-4"
        >
          Start a Session
        </button>

        {/* Footer */}
        <div className="animate-fade-in animate-fade-in-delay-4 mt-5 flex flex-col items-center gap-1.5">
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}
          >
            Built by{' '}
            <a
              href="https://gavinpurcell.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}
            >
              Gavin Purcell
            </a>
            , a human and{' '}
            <a
              href="https://claude.ai"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--accent-gold)', textDecoration: 'none' }}
            >
              Claude
            </a>
            , an AI
          </p>
          <div className="flex items-center gap-4" style={{ color: 'var(--text-muted)' }}>
            <a
              href="https://x.com/gavinpurcell"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5"
              style={{ textDecoration: 'none', color: 'inherit', fontSize: '11px', fontFamily: "'DM Mono', monospace" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @gavinpurcell
            </a>
            <span style={{ opacity: 0.3 }}>&middot;</span>
            <a
              href="https://aiforhumans.show"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: '11px',
                color: 'inherit',
                textDecoration: 'none',
              }}
            >
              AI For Humans
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
