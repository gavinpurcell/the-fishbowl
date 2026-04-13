'use client';

import Link from 'next/link';

export default function CapacityPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--dark-surface)',
        position: 'relative',
        overflow: 'hidden',
        padding: '2rem',
      }}
    >
      {/* Scanline overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 2,
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(255, 255, 255, 0.015) 2px,
            rgba(255, 255, 255, 0.015) 4px
          )`,
        }}
      />

      {/* Static noise overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 1,
          opacity: 0.06,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '256px',
        }}
      />

      {/* Ambient gold glow */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '500px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(196, 154, 42, 0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: '520px',
        }}
      >
        {/* Character portrait — thinking */}
        <div
          style={{
            width: '64px',
            height: '64px',
            marginBottom: '24px',
            borderRadius: '8px',
            overflow: 'hidden',
            imageRendering: 'pixelated',
            border: '2px solid var(--dark-border)',
            background: 'rgba(255, 255, 255, 0.03)',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/sprites/characters/char_1_thinking.png"
            alt="Thinking character"
            width={64}
            height={64}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              imageRendering: 'pixelated',
            }}
          />
        </div>

        {/* STANDING ROOM ONLY heading */}
        <h1
          className="capacity-text"
          style={{
            fontFamily: "'Silkscreen', 'Courier New', monospace",
            fontSize: 'clamp(1.2rem, 4.5vw, 2rem)',
            color: 'var(--accent-gold-light)',
            letterSpacing: '0.1em',
            lineHeight: 1.2,
            marginBottom: '12px',
            textShadow: '0 0 20px rgba(196, 154, 42, 0.3), 0 0 60px rgba(196, 154, 42, 0.1)',
          }}
        >
          STANDING ROOM ONLY
        </h1>

        {/* Gold rule */}
        <div
          style={{
            width: 'min(200px, 60vw)',
            height: '2px',
            background: `linear-gradient(
              90deg,
              transparent 0%,
              var(--accent-gold) 20%,
              var(--accent-gold-light) 50%,
              var(--accent-gold) 80%,
              transparent 100%
            )`,
            marginBottom: '20px',
            opacity: 0.6,
          }}
        />

        {/* Description */}
        <p
          style={{
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontSize: 'clamp(0.9rem, 2.2vw, 1.05rem)',
            color: 'rgba(250, 246, 240, 0.6)',
            lineHeight: 1.7,
            marginBottom: '8px',
          }}
        >
          The Fishbowl has used up its daily budget. Live sessions reset every 24 hours.
        </p>

        {/* Status label */}
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(250, 246, 240, 0.2)',
            marginBottom: '36px',
          }}
        >
          DAILY CAPACITY REACHED &middot; RESETS AT MIDNIGHT UTC
        </span>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            width: '100%',
            maxWidth: '320px',
          }}
        >
          {/* Primary: Watch the demo */}
          <Link
            href="/demo"
            className="cta-game-button"
            style={{
              textDecoration: 'none',
              fontSize: '13px',
              padding: '14px 28px',
              display: 'block',
              textAlign: 'center',
            }}
          >
            Watch a Recorded Session
          </Link>

          {/* Secondary: Run your own */}
          <a
            href="https://github.com/gavinpurcell/the-fishbowl"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '8px',
              border: '1px solid var(--dark-border)',
              background: 'rgba(255, 255, 255, 0.03)',
              color: 'rgba(250, 246, 240, 0.6)',
              fontFamily: "'DM Mono', monospace",
              fontSize: '12px',
              letterSpacing: '0.04em',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.borderColor = 'var(--accent-gold)';
              e.currentTarget.style.color = 'var(--accent-gold)';
              e.currentTarget.style.background = 'rgba(196, 154, 42, 0.06)';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.borderColor = 'var(--dark-border)';
              e.currentTarget.style.color = 'rgba(250, 246, 240, 0.6)';
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            Run Your Own Instance
          </a>
        </div>

        {/* Reassurance */}
        <p
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '11px',
            color: 'rgba(250, 246, 240, 0.25)',
            marginTop: '28px',
            lineHeight: 1.6,
          }}
        >
          The Fishbowl is free and open source. Bring your own API key and run unlimited sessions locally.
        </p>

        {/* Back to home */}
        <Link
          href="/"
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '11px',
            color: 'rgba(250, 246, 240, 0.3)',
            marginTop: '16px',
            textDecoration: 'none',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.currentTarget.style.color = 'var(--accent-gold)';
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
            e.currentTarget.style.color = 'rgba(250, 246, 240, 0.3)';
          }}
        >
          &larr; Back to The Fishbowl
        </Link>
      </div>

      {/* Subtle pulse animation on heading */}
      <style>{`
        @keyframes capacityPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }

        .capacity-text {
          animation: capacityPulse 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
