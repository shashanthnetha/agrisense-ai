import Link from 'next/link';
import { SiteHeader } from '@/components/site/SiteHeader';
import { PageHero } from '@/components/site/PageHero';
import { SiteFooter } from '@/components/site/SiteFooter';

export default function HistoryPage() {
  return (
    <div className="bg-sheet text-ink">
      <SiteHeader tone="dark" />
      <main id="main">
        <PageHero label="History" title="Your scans." />
        <div className="wrap py-10 sm:py-16">
        <div className="rounded-[4px] border border-line px-6 py-14 sm:py-16">
          <p className="font-serif text-[28px] leading-[32px]">No scans saved yet</p>
          <p className="mt-3 max-w-[26rem] text-[15px] leading-[23px] text-ink-2">
            Scans are not stored in this version, so earlier reports cannot be reopened. Take a screenshot of a report you want to keep.
          </p>
          <Link href="/scan" className="mt-8 inline-flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-sheet transition-transform active:scale-[0.98]">
            Scan a leaf
          </Link>
        </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
