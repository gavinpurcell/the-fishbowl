import type { Metadata } from 'next';
import './globals.css';
import ActiveSessionBanner from '@/components/ActiveSessionBanner';
import ThemeToggle from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: {
    default: 'The Fishbowl',
    template: '%s — The Fishbowl',
  },
  description:
    'Assemble a panel of AI experts, pitch your idea, and watch them debate it live in a pixel-art scene.',
  openGraph: {
    title: 'The Fishbowl',
    description:
      'Assemble a panel of AI experts, pitch your idea, and watch them debate it live in a pixel-art scene.',
    type: 'website',
    siteName: 'The Fishbowl',
    url: 'https://fishbowl.show',
    images: [
      {
        url: 'https://fishbowl.show/og-image.png',
        width: 1200,
        height: 630,
        alt: 'The Fishbowl - AI experts debating in a pixel art scene',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The Fishbowl',
    description:
      'Assemble a panel of AI experts, pitch your idea, and watch them debate it live in a pixel-art scene.',
    images: ['https://fishbowl.show/og-image.png'],
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

// Blocking script to apply saved theme before first paint (prevents flash)
const themeScript = `
  (function() {
    try {
      var t = localStorage.getItem('fishbowl-theme');
      if (t === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      }
    } catch(e) {}
  })();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#111010" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased">
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <ThemeToggle />
        <ActiveSessionBanner />
        <main id="main-content" className="page-transition-wrapper">{children}</main>
      </body>
    </html>
  );
}
