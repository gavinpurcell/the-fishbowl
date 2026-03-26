import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Demo - The Fishbowl',
  description: 'Watch a pre-recorded AI focus group session. Four experts discuss The Fishbowl itself.',
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
