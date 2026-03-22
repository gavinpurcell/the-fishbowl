import type { Metadata } from 'next';
import './globals.css';
import ActiveSessionBanner from '@/components/ActiveSessionBanner';

export const metadata: Metadata = {
  title: 'The Fishbowl — AI Focus Group',
  description: 'Watch AI experts debate your ideas in a visual pixel-art scene. Then step in and ask questions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ActiveSessionBanner />
        <div className="page-transition-wrapper">{children}</div>
      </body>
    </html>
  );
}
