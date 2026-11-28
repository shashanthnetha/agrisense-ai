'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from './Wordmark';

const LINKS = [
  { href: '/guide', label: 'Photo guide' },
  { href: '/limits', label: 'Before you spray' },
  { href: '/history', label: 'History' },
];

export function SiteHeader({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  const path = usePathname();
  return (
    <header className={dark ? 'dark-surface border-b border-bone/15 bg-leaf text-bone' : 'border-b border-line bg-sheet'}>
      <a href="#main" className="skip-link">Skip to content</a>
      <div className="wrap flex h-16 items-center justify-between gap-4">
        <Wordmark tone={dark ? 'bone' : 'ink'} />
        <nav aria-label="Main" className="hidden items-center gap-7 text-[14.5px] sm:flex">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className={`nav-link ${dark ? '!text-bone/75 hover:!text-bone' : ''}`} aria-current={path === l.href ? 'page' : undefined}>{l.label}</Link>
          ))}
        </nav>
        <Link href="/scan" className={`btn-ink !min-h-10 text-[14px] ${dark ? '!bg-lime !text-night' : ''}`}>Scan a leaf</Link>
      </div>
      <nav aria-label="Main (mobile)" className={`no-scrollbar wrap flex gap-6 overflow-x-auto border-t text-[14px] sm:hidden ${dark ? 'border-bone/15' : 'border-line'}`}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`nav-link shrink-0 ${dark ? '!text-bone/75 hover:!text-bone' : ''}`} aria-current={path === l.href ? 'page' : undefined}>{l.label}</Link>
        ))}
      </nav>
    </header>
  );
}
