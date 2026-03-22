'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useFishbowlStore } from '@/lib/store';

/**
 * Broadcast emergency ticker — shows on non-session pages when a
 * focus group session is live. Styled as a dark "ON AIR" warning strip
 * with a pulsing red LIVE dot and gold accent.
 */
export default function ActiveSessionBanner() {
  const pathname = usePathname();
  const status = useFishbowlStore((s) => s.status);
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch — only read persisted store on the client
  useEffect(() => setMounted(true), []);

  // Don't show on the session page itself, or if no session is running
  if (!mounted || status !== 'running' || pathname === '/session') {
    return null;
  }

  return (
    <div className="session-banner-enter fixed top-0 left-0 right-0 z-50">
      {/* Dark broadcast strip */}
      <div
        style={{
          background: 'var(--dark-surface)',
          borderBottom: '2px solid var(--accent-gold)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Pulsing red LIVE dot — matches session page REC indicator */}
            <span
              className="flex-shrink-0 w-2 h-2 rounded-full"
              style={{
                background: 'var(--accent-red)',
                boxShadow: '0 0 6px rgba(232, 90, 74, 0.6)',
                animation: 'badgePulse 2s ease-in-out infinite',
              }}
            />
            <span
              className="font-pixel flex-shrink-0"
              style={{
                fontSize: '10px',
                letterSpacing: '0.1em',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              SESSION IN PROGRESS
            </span>
          </div>
          <a
            href="/session"
            className="flex-shrink-0 flex items-center gap-1.5 transition-all group"
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: '11px',
              letterSpacing: '0.04em',
              color: 'var(--accent-gold)',
              textDecoration: 'none',
            }}
          >
            <span className="group-hover:underline">Return to control room</span>
            <span
              className="inline-block transition-transform group-hover:translate-x-0.5"
              style={{ fontSize: '13px' }}
            >
              &rarr;
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}
