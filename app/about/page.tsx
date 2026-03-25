import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Why I Made This',
};

export default function AboutPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-deep)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 24px',
      }}
    >
      <div style={{ maxWidth: '600px', width: '100%' }}>
        <Link
          href="/"
          style={{
            fontFamily: "'Silkscreen', cursive",
            fontSize: '10px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--accent-gold)',
            textDecoration: 'none',
            marginBottom: '32px',
            display: 'inline-block',
          }}
        >
          &larr; Back
        </Link>

        <h1
          style={{
            fontFamily: "'Silkscreen', cursive",
            fontSize: '24px',
            color: 'var(--accent-gold)',
            marginBottom: '24px',
          }}
        >
          Why I Made This
        </h1>

        <div
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '15px',
            lineHeight: '1.7',
            color: 'var(--text-secondary)',
          }}
        >
          <p style={{ marginBottom: '16px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
            Coming soon. Gavin is writing this part.
          </p>
        </div>
      </div>
    </div>
  );
}
