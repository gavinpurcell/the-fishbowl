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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      {/* Ambient glow — warmer and more visible */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] opacity-[0.10] rounded-full blur-[140px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, #e8c44a 0%, #c49a2a 60%, transparent 100%)' }}
      />

      {/* PixiJS Scene — wrapped in the retro viewport frame */}
      <div className="relative animate-fade-in w-full max-w-[480px]">
        <div
          ref={canvasRef}
          className="scene-viewport w-full"
          style={{
            aspectRatio: '420 / 280',
            background: 'var(--bg-surface)',
          }}
        />

        {/* LIVE badge */}
        <div className="scene-badge">
          <div className="scene-badge-dot" />
          <span
            className="font-pixel"
            style={{
              fontSize: '8px',
              color: 'rgba(250, 246, 240, 0.8)',
              letterSpacing: '0.1em',
            }}
          >
            LIVE
          </span>
        </div>
      </div>

      {/* Character roster dots — quick visual of who's in the room */}
      <div className="roster-dots animate-fade-in" style={{ marginTop: '6px' }}>
        {ROSTER_COLORS.map((color, i) => (
          <div
            key={color}
            className="roster-dot"
            style={{
              background: color,
              animationDelay: `${0.6 + i * 0.08}s`,
            }}
          />
        ))}
      </div>

      {/* Title lockup */}
      <div className="flex flex-col items-center mt-5">
        <h1
          className="title-text animate-title-reveal text-center"
          style={{ fontSize: 'clamp(2rem, 7vw, 3.5rem)' }}
        >
          THE FISHBOWL
        </h1>

        {/* Gold decorative rule */}
        <div className="title-rule mx-auto mt-3" />

        {/* Subtitle */}
        <p
          className="title-subtitle animate-subtitle-reveal mt-3 text-center"
          style={{ fontSize: 'clamp(0.55rem, 1.5vw, 0.7rem)' }}
        >
          AI Focus Groups For Your Ideas
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push('/setup')}
        className="cta-game-button animate-fade-in animate-fade-in-delay-3 mt-8"
      >
        Start a Session
      </button>

      {/* Footer note */}
      <p
        className="label-mono mt-5 text-[10px] tracking-widest animate-fade-in animate-fade-in-delay-4 text-center"
        style={{ color: 'var(--text-muted)' }}
      >
        No account needed &middot; Bring your own API key
      </p>
    </div>
  );
}
