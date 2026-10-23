import './globals.css';
import Link from 'next/link';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'CineVault',
  description: 'Movie and series discovery with your own add-ons.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="mx-auto max-w-5xl px-4 pb-10 pt-6 text-xs text-zinc-500">
          <Link href="/tos" className="mr-4 hover:text-zinc-300">Terms</Link>
          <Link href="/privacy" className="hover:text-zinc-300">Privacy</Link>
        </footer>
      </body>
    </html>
  );
}
