import Link from 'next/link';

export default function NotFound() {
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
          maxWidth: '480px',
        }}
      >
        {/* 404 watermark */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -55%)',
            fontFamily: "'DM Mono', monospace",
            fontSize: 'clamp(8rem, 25vw, 14rem)',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.03)',
            lineHeight: 1,
            letterSpacing: '-0.02em',
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        >
          404
        </div>

        {/* Character portrait — confused look */}
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
            src="/sprites/characters/char_2_thinking.png"
            alt="Confused character"
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

        {/* SIGNAL LOST heading */}
        <h1
          className="signal-lost-text"
          style={{
            fontFamily: "'Silkscreen', 'Courier New', monospace",
            fontSize: 'clamp(1.5rem, 5vw, 2.5rem)',
            color: 'var(--accent-gold-light)',
            letterSpacing: '0.12em',
            lineHeight: 1.2,
            marginBottom: '12px',
            textShadow: '0 0 20px rgba(196, 154, 42, 0.3), 0 0 60px rgba(196, 154, 42, 0.1)',
          }}
        >
          SIGNAL LOST
        </h1>

        {/* Gold rule */}
        <div
          style={{
            width: 'min(160px, 50vw)',
            height: '2px',
            background: `linear-gradient(
              90deg,
              transparent 0%,
              var(--accent-gold) 20%,
              var(--accent-gold-light) 50%,
              var(--accent-gold) 80%,
              transparent 100%
            )`,
            marginBottom: '16px',
            opacity: 0.6,
          }}
        />

        {/* Description */}
        <p
          style={{
            fontFamily: "'Outfit', system-ui, sans-serif",
            fontSize: 'clamp(0.85rem, 2vw, 1rem)',
            color: 'rgba(250, 246, 240, 0.5)',
            lineHeight: 1.6,
            marginBottom: '8px',
          }}
        >
          This channel doesn&apos;t exist.
        </p>

        {/* Error code label */}
        <span
          style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(250, 246, 240, 0.2)',
            marginBottom: '32px',
          }}
        >
          ERR 404 &middot; NO BROADCAST FOUND
        </span>

        {/* Return CTA */}
        <Link
          href="/"
          className="cta-game-button"
          style={{
            textDecoration: 'none',
            fontSize: '12px',
            padding: '12px 28px',
          }}
        >
          Return to Broadcast
        </Link>
      </div>

      {/* Flicker animation styles */}
      <style>{`
        @keyframes signalFlicker {
          0%, 95%, 100% { opacity: 1; }
          96% { opacity: 0.7; }
          97% { opacity: 1; }
          98% { opacity: 0.4; }
          99% { opacity: 1; }
        }

        .signal-lost-text {
          animation: signalFlicker 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
