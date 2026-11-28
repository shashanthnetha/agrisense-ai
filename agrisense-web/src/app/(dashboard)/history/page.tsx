import Link from 'next/link';
import { Wordmark } from '@/components/site/Wordmark';

export default function HistoryPage() {
  return (
    <div className="dark-surface min-h-screen bg-night text-bone">
      <header className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-5 sm:px-10">
        <Wordmark tone="bone" />
        <nav aria-label="Main" className="flex items-center gap-6 text-[14px]">
          <Link href="/scan" className="text-bone/70 transition-colors hover:text-bone">New scan</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-[1320px] px-5 pb-24 pt-8 sm:px-10">
        <p className="label">History</p>
        <h1 className="display mt-4 text-[56px] sm:text-[88px]">Your <em>scans.</em></h1>
        <div className="mt-10 rounded-[6px] border border-bone/25 bg-bone/[0.04] px-6 py-16 sm:py-20">
          <p className="font-serif text-[28px] leading-[32px]">No scans saved yet</p>
          <p className="mt-3 max-w-[26rem] text-[15px] leading-[23px] text-bone/75">
            Scans are not stored in this version, so earlier reports cannot be reopened. Take a screenshot of a report you want to keep.
          </p>
          <Link href="/scan" className="mt-8 inline-flex h-12 items-center rounded-full bg-lime px-6 text-[15px] font-medium text-night transition-transform active:scale-[0.98]">
            Scan a leaf
          </Link>
        </div>
      </main>
    </div>
  );
}
