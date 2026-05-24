'use client';

import { useEffect, useState } from 'react';

/**
 * Catches phones in portrait orientation and asks the user to rotate.
 * The Fishbowl is a widescreen / cinematic experience — a portrait mobile
 * layout would require a separate UI we haven't built. Until then, gate.
 *
 * Trigger: portrait orientation AND viewport width <= 932px (covers all
 * phones in portrait; iPad mini in portrait at 768px is also caught; iPad in
 * landscape at 1024px+ is NOT). The user can tap "Use it anyway" if they're
 * stuck (e.g., rotation lock on, edge cases on a tablet held weird).
 */

const PORTRAIT_QUERY = '(orientation: portrait) and (max-width: 932px)';

export default function MobileLandscapeGate() {
  const [shouldGate, setShouldGate] = useState(false);
  const [overridden, setOverridden] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia(PORTRAIT_QUERY);
    const update = () => setShouldGate(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  if (!shouldGate || overridden) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Rotate device to landscape"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0b0d11',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
        textAlign: 'center',
        color: 'rgba(250, 246, 240, 0.96)',
        fontFamily: "'Outfit', system-ui, sans-serif",
      }}
    >
      <style>{`
        @keyframes rotateHint {
          0%   { transform: rotate(0deg);   }
          30%  { transform: rotate(0deg);   }
          55%  { transform: rotate(-90deg); }
          85%  { transform: rotate(-90deg); }
          100% { transform: rotate(0deg);   }
        }
      `}</style>

      <div style={{ marginBottom: '28px', animation: 'rotateHint 2.8s ease-in-out infinite' }}>
        <svg width="92" height="92" viewBox="0 0 64 64" fill="none">
          <rect x="22" y="6" width="20" height="36" rx="3" stroke="#c7a15a" strokeWidth="2.5" />
          <rect x="28" y="11" width="8" height="22" rx="0.5" fill="rgba(199, 161, 90, 0.18)" />
          <circle cx="32" cy="38" r="1.5" fill="#c7a15a" />
          <path
            d="M14 52 C 14 56 18 60 22 60 L 42 60 C 46 60 50 56 50 52"
            stroke="#c7a15a"
            strokeWidth="1.5"
            strokeDasharray="3 3"
            fill="none"
            strokeLinecap="round"
          />
          <path d="M48 49 L 51 52 L 48 55" stroke="#c7a15a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      </div>

      <div
        style={{
          fontFamily: "'Silkscreen', monospace",
          fontSize: '15px',
          letterSpacing: '0.06em',
          color: '#c7a15a',
          marginBottom: '10px',
        }}
      >
        ROTATE YOUR PHONE
      </div>

      <h1
        style={{
          fontFamily: "'Silkscreen', monospace",
          fontSize: '22px',
          lineHeight: 1.2,
          margin: '0 0 14px',
          color: 'rgba(250, 246, 240, 0.96)',
        }}
      >
        THE FISHBOWL IS WIDESCREEN
      </h1>

      <p
        style={{
          fontSize: '14px',
          lineHeight: 1.5,
          color: 'rgba(250, 246, 240, 0.7)',
          maxWidth: '320px',
          margin: '0 0 28px',
        }}
      >
        Turn your phone to landscape for the full panel-room view. The scene auto-fits once you rotate.
      </p>

      <button
        onClick={() => setOverridden(true)}
        style={{
          background: 'transparent',
          color: 'rgba(250, 246, 240, 0.5)',
          border: '1px solid rgba(250, 246, 240, 0.15)',
          borderRadius: '4px',
          padding: '8px 14px',
          fontFamily: "'DM Mono', monospace",
          fontSize: '10px',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          cursor: 'pointer',
        }}
      >
        Use it anyway
      </button>
    </div>
  );
}
