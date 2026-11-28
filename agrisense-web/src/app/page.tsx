import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Loupe } from '@/components/site/Loupe';
import { ReportAnatomy } from '@/components/site/ReportAnatomy';

export default function Home() {
  return (
    <div className="bg-sheet text-ink">
      <SiteHeader />
      <main>
        <section className="wrap grid items-center gap-10 py-10 sm:py-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-20">
          <div>
            <p className="label !text-signal">Crop leaf check</p>
            <h1 className="head page-h1 mt-4 max-w-[18ch]">Look closer at the leaf. Then ask the right person.</h1>
            <p className="mt-5 max-w-[34rem] text-[17px] leading-[27px] text-ink-2">
              Photograph one affected leaf. AgriSense says what it most resembles and what symptoms it reported, then sends you to a local agriculture officer to confirm before you spray anything.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Link href="/scan" className="btn-ink">Scan a leaf <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              <Link href="/guide" className="text-[15px] underline decoration-ink/30 underline-offset-[6px] hover:decoration-ink">How to take the photo</Link>
            </div>
          </div>
          <Loupe src="/early-blight-sample.jpg" alt="Close photo of tomato leaves with dark spots and yellow edges" />
        </section>

        <section className="border-t border-line">
          <div className="wrap py-14 sm:py-20">
            <p className="label">What comes back</p>
            <h2 className="head page-h2 mt-3 max-w-[22ch]">A short report, built so the next step comes first.</h2>
            <div className="mt-10"><ReportAnatomy /></div>
          </div>
        </section>

        <section className="border-t border-line bg-raised/50">
          <div className="wrap grid gap-px py-0 md:grid-cols-2">
            <Link href="/guide" className="group flex flex-col justify-between gap-10 py-10 md:pr-10 sm:py-14">
              <div><p className="label !text-signal">Before you scan</p>
                <h2 className="head page-h2 mt-3">Why most bad readings start with the photo.</h2>
                <p className="mt-3 max-w-[40ch] text-[15px] leading-[23px] text-ink-2">Try the five common photo problems on the same leaf and see what each one hides.</p></div>
              <span className="inline-flex items-center gap-2 text-[15px] font-medium">Open the photo guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>
            </Link>
            <Link href="/limits" className="group flex flex-col justify-between gap-10 border-t border-line py-10 sm:py-14 md:border-l md:border-t-0 md:pl-10">
              <div><p className="label !text-signal">Before you spray</p>
                <h2 className="head page-h2 mt-3">What this can&rsquo;t tell you, and what to take to the officer.</h2>
                <p className="mt-3 max-w-[40ch] text-[15px] leading-[23px] text-ink-2">A printable checklist of what to bring and what to ask.</p></div>
              <span className="inline-flex items-center gap-2 text-[15px] font-medium">Open the checklist <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
