'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useFishbowlStore } from '@/lib/store';

/**
 * Shows a subtle top banner on non-session pages when a focus group session
 * is currently running. Lets the user quickly return to their active session
 * instead of losing it by navigating elsewhere.
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
    <div
      className="fixed top-0 left-0 right-0 z-50 animate-fade-in"
      style={{
        background: 'linear-gradient(90deg, var(--accent-gold), var(--accent-amber))',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {/* Pulsing dot */}
          <span
            className="flex-shrink-0 w-2 h-2 rounded-full animate-pulse"
            style={{ background: 'var(--bg-deep)' }}
          />
          <span
            className="text-xs font-600 truncate"
            style={{ color: 'var(--bg-deep)' }}
          >
            Focus group session in progress
          </span>
        </div>
        <a
          href="/session"
          className="flex-shrink-0 px-3 py-1 rounded-md text-xs font-600 transition-all hover:brightness-110"
          style={{
            background: 'var(--bg-deep)',
            color: 'var(--accent-gold)',
          }}
        >
          Return to session
        </a>
      </div>
    </div>
  );
}
