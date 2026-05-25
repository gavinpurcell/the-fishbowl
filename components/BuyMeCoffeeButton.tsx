'use client';

import { useState } from 'react';

const BMC_URL = 'https://www.buymeacoffee.com/gavinpurcell';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * On-brand Buy Me a Coffee link. Skips the official yellow image button so it
 * doesn't clash with the warm-dark Specimen Tag UI.
 *
 * `variant="footer"` is compact for the homepage credit row.
 * `variant="popup"` is a slightly larger, more inviting block for the post-
 * email "thanks" state of the lead-capture popup.
 */
export default function BuyMeCoffeeButton({
  variant = 'footer',
}: {
  variant?: 'footer' | 'popup';
}) {
  const [hovering, setHovering] = useState(false);
  const compact = variant === 'footer';

  return (
    <a
      href={BMC_URL}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={(e) => {
        setHovering(true);
        if (prefersReducedMotion()) return;
        e.currentTarget.style.transform = 'translate(-2px, -2px)';
        e.currentTarget.style.boxShadow = '4px 4px 0 var(--accent-gold)';
      }}
      onMouseLeave={(e) => {
        setHovering(false);
        if (prefersReducedMotion()) return;
        e.currentTarget.style.transform = 'translate(0, 0)';
        e.currentTarget.style.boxShadow = '0 0 0 transparent';
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: compact ? '6px' : '8px',
        textDecoration: 'none',
        background: hovering ? 'var(--accent-gold)' : 'transparent',
        color: hovering ? 'var(--dark-deep)' : 'var(--accent-gold)',
        border: '1px solid var(--accent-gold)',
        borderRadius: '4px',
        padding: compact ? '5px 10px' : '10px 16px',
        fontFamily: "'DM Mono', monospace",
        fontSize: compact ? '9px' : '11px',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: 'transform 0.08s ease, box-shadow 0.08s ease, background 0.12s ease, color 0.12s ease',
      }}
    >
      {/* Tiny pixel coffee cup */}
      <svg width={compact ? 12 : 14} height={compact ? 12 : 14} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3 5 H11 V11 a2 2 0 0 1 -2 2 H5 a2 2 0 0 1 -2 -2 Z"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinejoin="round"
        />
        <path
          d="M11 6 h1.5 a1.5 1.5 0 0 1 0 3 H11"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          strokeLinejoin="round"
        />
        <path d="M5 2 V3 M7.5 2 V3 M10 2 V3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      <span>▸ Buy me a coffee</span>
    </a>
  );
}
