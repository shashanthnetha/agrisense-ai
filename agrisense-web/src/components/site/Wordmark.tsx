import Link from 'next/link';

export function Wordmark({ href = '/', tone = 'ink' }: { href?: string; tone?: 'ink' | 'bone' }) {
  return (
    <Link href={href} aria-label="AgriSense AI home" className={`inline-flex items-center gap-2 ${tone === 'bone' ? 'text-bone' : 'text-ink'}`}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M10 2c4.6 1.2 7 5 6 9.6C15 15.5 12.2 17.6 10 18c-2.2-.4-5-2.5-6-6.4C3 7 5.4 3.2 10 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M10 18V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span className="font-serif text-[21px] leading-none">AgriSense</span>
    </Link>
  );
}
