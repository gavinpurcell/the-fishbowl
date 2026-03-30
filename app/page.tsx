'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TitleScene } from '@/scene/TitleScene';
import { loadTitleSprites } from '@/lib/spriteLoader';

const ROSTER_COLORS = ['#4a9e6e', '#c45a5a', '#5a7ec4', '#d4a040', '#9a6ab4'];

export default function TitlePage() {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TitleScene | null>(null);

  useEffect(() => {
    if (!canvasRef.current || sceneRef.current) return;
    const scene = new TitleScene();
    sceneRef.current = scene;
    loadTitleSprites().then(() => {
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
          style={{ fontSize: '28px', padding: '16px 46px' }}
        >
          Start a Session
        </button>

        {/* Demo link */}
        <a
          href="/demo"
          className="animate-fade-in animate-fade-in-delay-4 group"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '14px',
            fontFamily: "'DM Mono', monospace",
            fontSize: '11px',
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            transition: 'color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--accent-gold)';
            const arrow = e.currentTarget.querySelector('.demo-arrow') as HTMLElement;
            if (arrow) arrow.style.transform = 'translateX(3px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            const arrow = e.currentTarget.querySelector('.demo-arrow') as HTMLElement;
            if (arrow) arrow.style.transform = 'translateX(0)';
          }}
        >
          <span>or watch the demo</span>
          <span className="demo-arrow" style={{ transition: 'transform 0.2s ease', display: 'inline-block' }}>&rarr;</span>
        </a>

        {/* Footer */}
        <div className="animate-fade-in animate-fade-in-delay-5 mt-3 flex flex-col items-center gap-3">
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '12px',
              color: 'var(--text-muted)',
              margin: 0,
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
          <div className="flex items-center gap-3" style={{ color: 'var(--text-muted)' }}>
            <a
              href="/about"
              style={{
                fontFamily: "'Silkscreen', monospace",
                fontSize: '9px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                border: '1px solid var(--dark-border)',
                borderRadius: '4px',
                padding: '4px 10px',
                transition: 'border-color 0.2s ease, color 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--accent-gold)';
                e.currentTarget.style.color = 'var(--accent-gold)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--dark-border)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              Why I Made This
            </a>
            <span style={{ opacity: 0.2 }}>&middot;</span>
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
            <span style={{ opacity: 0.2 }}>&middot;</span>
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
            <span style={{ opacity: 0.2 }}>&middot;</span>
            <a
              href="https://github.com/gavinpurcell/the-fishbowl"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5"
              style={{ textDecoration: 'none', color: 'inherit', fontSize: '11px', fontFamily: "'DM Mono', monospace" }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
