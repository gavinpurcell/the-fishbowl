import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Fishbowl — AI Focus Group',
  description: 'Watch AI experts debate your ideas in a visual pixel-art scene. Then step in and ask questions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
