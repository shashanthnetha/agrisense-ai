import Link from 'next/link';
import { Wordmark } from '@/components/site/Wordmark';

export default function HistoryPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Wordmark />
        <nav aria-label="Main" className="flex items-center gap-6 text-[14px]">
          <Link href="/scan" className="text-ink-2 transition-colors hover:text-ink">New scan</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-8">
        <p className="label">History</p>
        <h1 className="mt-3 text-[40px] leading-[1.06] tracking-[-0.02em] sm:text-[48px]">Your scans</h1>
        <div className="mt-10 rounded-2xl border border-line bg-card px-6 py-16 text-center">
          <p className="text-[24px] leading-[28px]">No scans saved yet</p>
          <p className="mx-auto mt-2 max-w-[26rem] text-[15px] leading-[22px] text-ink-2">
            Scans are not stored in this version, so earlier reports cannot be reopened. Take a screenshot of a report you want to keep.
          </p>
          <Link href="/scan" className="mt-8 inline-flex h-12 items-center rounded-[10px] bg-ink px-6 text-[15px] font-medium text-paper transition-colors hover:bg-ink/85">
            Scan a leaf
          </Link>
        </div>
      </main>
    </div>
  );
}
