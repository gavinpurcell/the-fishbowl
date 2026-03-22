'use client';

import { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TitleScene } from '@/scene/TitleScene';
import { loadAllSprites } from '@/lib/spriteLoader';

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
    <div className="min-h-screen flex flex-col items-center justify-center">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] opacity-[0.08] rounded-full blur-[120px] pointer-events-none"
           style={{ background: 'var(--accent-gold)' }} />

      {/* PixiJS Scene */}
      <div className="relative animate-fade-in">
        <div
          ref={canvasRef}
          className="rounded-xl overflow-hidden border-2"
          style={{
            width: 420,
            height: 280,
            borderColor: 'var(--border)',
            background: 'var(--bg-surface)',
          }}
        />
        <div className="absolute bottom-1.5 right-2.5 label-mono text-[8px]"
             style={{ color: 'var(--text-muted)' }}>
          Live Scene
        </div>
      </div>

      {/* Title */}
      <h1 className="text-5xl font-800 tracking-tight mt-8 animate-fade-in animate-fade-in-delay-1"
          style={{ color: 'var(--text-primary)', letterSpacing: '-1px' }}>
        THE FISHBOWL
      </h1>
      <p className="text-lg mt-2 animate-fade-in animate-fade-in-delay-2" style={{ color: 'var(--text-secondary)' }}>
        AI Focus Groups For Your Ideas
      </p>

      {/* CTA */}
      <button
        onClick={() => router.push('/setup')}
        className="mt-8 px-12 py-4 rounded-xl text-lg font-semibold text-white cursor-pointer transition-all duration-200 cta-glow animate-fade-in animate-fade-in-delay-3"
        style={{
          background: 'var(--accent-gold)',
        }}
      >
        Get Started Now
      </button>
      <p className="label-mono mt-4 text-[11px] tracking-widest animate-fade-in animate-fade-in-delay-4"
         style={{ color: 'var(--text-muted)' }}>
        No account needed · Bring your own API key
      </p>
    </div>
  );
}
