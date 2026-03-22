import type { Metadata } from 'next';
import './globals.css';
import ActiveSessionBanner from '@/components/ActiveSessionBanner';

export const metadata: Metadata = {
  title: {
    default: 'The Fishbowl — AI Focus Groups',
    template: '%s — The Fishbowl',
  },
  description:
    'Assemble a panel of AI experts, pitch your idea, and watch them debate it live in a pixel-art scene. Then step in and ask questions.',
  openGraph: {
    title: 'The Fishbowl — AI Focus Groups',
    description:
      'Assemble a panel of AI experts, pitch your idea, and watch them debate it live. Then step in and ask questions.',
    type: 'website',
    siteName: 'The Fishbowl',
  },
  twitter: {
    card: 'summary',
    title: 'The Fishbowl — AI Focus Groups',
    description:
      'Assemble a panel of AI experts, pitch your idea, and watch them debate it live.',
  },
  icons: {
    icon: [
      {
        url: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="%231a1714"/><ellipse cx="16" cy="15" rx="9" ry="10" fill="none" stroke="%23e8c44a" stroke-width="2"/><ellipse cx="16" cy="20" rx="6" ry="3" fill="none" stroke="%23e8c44a" stroke-width="1.5"/><circle cx="13" cy="13" r="1.5" fill="%23e8c44a"/><path d="M14.5 13.5 Q16 11 17.5 13" stroke="%23e8c44a" stroke-width="1" fill="none" stroke-linecap="round"/></svg>',
        type: 'image/svg+xml',
      },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#f5f0e8" />
      </head>
      <body className="antialiased">
        <ActiveSessionBanner />
        <div className="page-transition-wrapper">{children}</div>
      </body>
    </html>
  );
}
