import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Loupe } from '@/components/site/Loupe';
import { ContactSheet } from '@/components/site/ContactSheet';
import { ReportAnatomy } from '@/components/site/ReportAnatomy';

/* The recurring motif is the target ring: early blight spots have concentric rings, and the lens carries them. */
function Rings({ className = '' }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 400 400" className={className} fill="none" stroke="currentColor">
      {[30, 62, 98, 138, 182, 230, 282].map((r, i) => (
        <circle key={r} cx="200" cy="200" r={r} strokeWidth={i === 2 ? 1.5 : 1} strokeDasharray={i % 3 === 1 ? '2 7' : undefined} />
      ))}
    </svg>
  );
}

export default function Home() {
  return (
    <div className="bg-sheet text-ink">
      <SiteHeader tone="dark" />
      <main id="main">
        <section className="dark-surface relative isolate overflow-hidden bg-leaf text-bone">
          <Rings className="pointer-events-none absolute -left-40 -top-48 -z-10 h-[620px] w-[620px] text-lime opacity-[0.07]" />
          <Rings className="pointer-events-none absolute -bottom-72 right-[-10rem] -z-10 h-[820px] w-[820px] text-lime opacity-[0.06]" />
          <div className="wrap grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-24">
            <div>
              <p className="label !text-lime">Crop leaf check</p>
              <h1 className="head mt-4 max-w-[14ch] text-[clamp(38px,5.4vw,72px)]">Look closer at the leaf<span className="text-lime">.</span> Then ask the right person<span className="text-lime">.</span></h1>
              <p className="mt-6 max-w-[34rem] text-[17px] leading-[27px] text-bone/80">
                Photograph one affected leaf. AgriSense says what it most resembles and what symptoms it reported, then sends you to a local agriculture officer to confirm before you spray anything.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
                <Link href="/scan" className="btn-ink !bg-lime !text-night hover:!bg-bone">Scan a leaf <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                <Link href="/guide" className="text-[15px] underline decoration-bone/40 underline-offset-[6px] hover:decoration-bone">How to take the photo</Link>
              </div>
            </div>
            <Loupe dark src="/early-blight-sample.jpg" alt="Close photo of tomato leaves with dark spots and yellow edges" />
          </div>
        </section>

        <section>
          <div className="wrap py-14 sm:py-24">
            <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:gap-14">
              <span aria-hidden className="head text-[clamp(64px,10vw,140px)] leading-none text-signal/90">01</span>
              <div className="self-end">
                <p className="label">What comes back</p>
                <h2 className="head page-h2 mt-3 max-w-[22ch]">A short report, built so the next step comes first.</h2>
              </div>
            </div>
            <div className="mt-12"><ReportAnatomy /></div>
          </div>
        </section>

        <section className="dark-surface bg-night text-bone">
          <div className="wrap py-14 sm:py-24">
            <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:gap-14">
              <span aria-hidden className="head text-[clamp(64px,10vw,140px)] leading-none text-lime/90">02</span>
              <div className="self-end">
                <p className="label">What a good photo gives it to read</p>
                <h2 className="head page-h2 mt-3 max-w-[22ch]">Close enough to see the edge of a spot.</h2>
                <p className="mt-4 max-w-[52ch] text-[16px] leading-[25px] text-bone/75">Four crops of the same sample photo. The reading is only as good as what is sharp in the frame: the rim of a spot, the colour change around it, and normal leaf to compare.</p>
              </div>
            </div>
            <div className="mt-12"><ContactSheet /></div>
          </div>
        </section>

        <section className="bg-lime text-night">
          <div className="wrap grid gap-px md:grid-cols-2">
            <Link href="/guide" className="group flex flex-col justify-between gap-10 py-12 sm:py-16 md:pr-12">
              <div><p className="label !text-night/70">Before you scan</p>
                <h2 className="head page-h2 mt-3">Why most bad readings start with the photo.</h2>
                <p className="mt-3 max-w-[40ch] text-[15px] leading-[23px] text-night/80">Try the five common photo problems on the same leaf and see what each one hides.</p></div>
              <span className="inline-flex items-center gap-2 text-[15px] font-medium">Open the photo guide <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>
            </Link>
            <Link href="/limits" className="group flex flex-col justify-between gap-10 border-t border-night/25 py-12 sm:py-16 md:border-l md:border-t-0 md:pl-12">
              <div><p className="label !text-night/70">Before you spray</p>
                <h2 className="head page-h2 mt-3">What this can&rsquo;t tell you, and what to take to the officer.</h2>
                <p className="mt-3 max-w-[40ch] text-[15px] leading-[23px] text-night/80">A printable checklist of what to bring and what to ask.</p></div>
              <span className="inline-flex items-center gap-2 text-[15px] font-medium">Open the checklist <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
