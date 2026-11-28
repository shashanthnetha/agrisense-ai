import Link from 'next/link';
import { Wordmark } from '@/components/site/Wordmark';
import { ArrowRight } from 'lucide-react';
import { PhotoScene } from '@/components/scene/PhotoScene';

const LIMITS = [
  'It is a tentative identification from one photo, not a diagnosis.',
  'Confidence and affected-area figures are the model\u2019s own estimates, not measurements.',
  'It does not mark where on the leaf a problem is.',
  'It does not prescribe sprays or doses. Treatment is for a local agriculture officer to confirm.',
];

export default function Home() {
  return (
    <div className="bg-night text-bone">
      {/* HERO: the real photograph is the material */}
      <section className="dark-surface relative isolate flex min-h-[100svh] flex-col overflow-hidden lg:sticky lg:top-0">
        <div className="hero-shift absolute inset-0 -z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/early-blight-sample.jpg" alt="" className="hero-photo h-full w-full object-cover object-[62%_50%]" />
          <PhotoScene src="/early-blight-sample.jpg" mode="hero" focus={[0.62, 0.5]} />
        </div>
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgb(14_23_15/0.92)_0%,rgb(14_23_15/0.62)_42%,rgb(14_23_15/0.1)_75%),linear-gradient(0deg,rgb(14_23_15/0.85)_0%,transparent_45%)]" aria-hidden />

        <header className="mx-auto flex h-20 w-full max-w-[1320px] items-center justify-between px-6 sm:px-10">
          <Wordmark tone="bone" />
          <nav aria-label="Main" className="flex items-center gap-5 text-[14px] sm:gap-8">
            <a href="#how" className="hidden text-bone/80 transition-colors hover:text-bone sm:inline">How it works</a>
            <a href="#limits" className="hidden text-bone/80 transition-colors hover:text-bone sm:inline">What it does not do</a>
            <Link href="/scan" className="inline-flex h-10 items-center rounded-full bg-lime px-5 text-[14px] font-medium text-night transition-transform active:scale-[0.98]">Scan a leaf</Link>
          </nav>
        </header>

        <div className="mx-auto flex w-full max-w-[1320px] flex-1 flex-col justify-end gap-10 px-6 pb-10 pt-16 sm:px-10 sm:pb-14 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-[760px]">
            <p className="label rise">A crop disease check for farmers</p>
            <h1 className="display mt-5 text-[clamp(60px,11.5vw,150px)] text-bone">
              <span className="rv"><span>One photo.</span></span>
              <span className="rv"><span style={{ '--d': '130ms' } as React.CSSProperties}>A <em className="text-lime">likely</em></span></span>
              <span className="rv"><span style={{ '--d': '260ms' } as React.CSSProperties}><em className="text-lime">answer.</em></span></span>
            </h1>
            <p className="rise mt-7 max-w-[30rem] text-[17px] leading-[26px] text-bone/80" style={{ '--d': '600ms' } as React.CSSProperties}>
              Photograph the affected leaf. AgriSense names what it most resembles, lists the symptoms it reported, and points you to a local agriculture officer for confirmation.
            </p>
            <div className="rise mt-8 flex items-center gap-6" style={{ '--d': '720ms' } as React.CSSProperties}>
              <Link href="/scan" className="inline-flex h-14 items-center gap-3 rounded-full bg-lime px-8 text-[16px] font-medium text-night transition-transform active:scale-[0.98]">
                Scan a leaf <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
              </Link>
              <a href="#how" className="text-[15px] text-bone underline decoration-bone/40 underline-offset-[6px] hover:decoration-bone">See how it works</a>
            </div>
          </div>

          {/* A real report layout over the real photo, labelled as a sample */}
          <aside aria-label="Sample report" className="rise w-full shrink-0 rounded-[6px] bg-paper p-6 text-ink shadow-[0_30px_80px_-20px_rgb(0_0_0/0.6)] sm:max-w-[400px] lg:mb-2" style={{ '--d': '900ms' } as React.CSSProperties}>
            <p className="label flex items-center justify-between !text-ink-3"><span>Sample report</span><span>Illustrative</span></p>
            <p className="mt-4 text-[17px] italic leading-none text-ink-2 font-serif">Looks like</p>
            <p className="font-serif text-[46px] leading-[1.02] tracking-[-0.02em]">Early <em>Blight.</em></p>
            <p className="mt-3 text-[13.5px] leading-[20px] text-ink-2">A tentative AI identification from one photo, not a diagnosis.</p>
            <div className="mt-5 border-t border-line pt-4">
              <p className="label !text-madder">What now</p>
              <p className="mt-2 text-[15px] leading-[22px]">Ask a local agriculture officer what to do for this crop before spraying anything.</p>
            </div>
            <p className="mt-4 border-t border-line pt-3 text-[11.5px] leading-[17px] text-ink-3">Layout example only. Not a validated reading of the photo behind it.</p>
          </aside>
        </div>
      </section>

      {/* HOW IT WORKS: the three beats acted out on the real photograph */}
      <section id="how" className="relative z-10 -mt-6 rounded-t-[26px] bg-paper text-ink shadow-[0_-18px_40px_rgb(14_23_15/0.35)] lg:-mt-8">
        <div className="mx-auto max-w-[1320px] px-6 py-20 sm:px-10 sm:py-28">
          <p className="label">How it works</p>
          <h2 className="display mt-4 max-w-[14ch] text-[44px] sm:text-[72px]">Three steps, <em>one leaf.</em></h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-6">
            <li className="scroll-rise">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-night">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/early-blight-sample.jpg" alt="" className="h-full w-full object-cover object-[62%_58%]" />
                <span className="absolute inset-[12%] border border-bone/70" aria-hidden />
                {['left-[12%] top-[12%] border-l-2 border-t-2', 'right-[12%] top-[12%] border-r-2 border-t-2', 'left-[12%] bottom-[12%] border-b-2 border-l-2', 'right-[12%] bottom-[12%] border-b-2 border-r-2'].map((c) => (
                  <span key={c} className={`absolute h-6 w-6 -translate-x-px border-lime ${c}`} aria-hidden />
                ))}
                <span className="label absolute bottom-3 left-3 !text-bone/80">Fill the frame with one leaf</span>
              </div>
              <p className="label mt-5 !text-madder">01</p>
              <h3 className="display mt-1 text-[30px]">Photograph one leaf</h3>
              <p className="mt-2 max-w-[24rem] text-[15px] leading-[23px] text-ink-2">Daylight, close, steady. One affected leaf reads better than a whole plant.</p>
            </li>
            <li className="scroll-rise">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[6px] bg-night">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/early-blight-sample.jpg" alt="" className="h-full w-full object-cover object-[62%_58%] brightness-[0.7]" />
                <span className="sweep absolute inset-y-0 left-0 w-1/5 bg-gradient-to-r from-transparent via-bone/40 to-transparent" aria-hidden />
                <span className="label absolute bottom-3 left-3 !text-bone/80">Read evenly. Nothing marked.</span>
              </div>
              <p className="label mt-5 !text-madder">02</p>
              <h3 className="display mt-1 text-[30px]">The model reads it</h3>
              <p className="mt-2 max-w-[24rem] text-[15px] leading-[23px] text-ink-2">An AI model looks at the whole photo and reports the symptoms it can see and the disease they most resemble.</p>
            </li>
            <li className="scroll-rise">
              <div className="relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-[6px] bg-leaf p-5 text-bone">
                <p className="label !text-bone/60">Sample report · illustrative</p>
                <p className="mt-3 font-serif text-[18px] italic text-bone/80">Looks like</p>
                <p className="font-serif text-[44px] leading-none tracking-[-0.02em]">Early <em>Blight.</em></p>
                <p className="mt-3 text-[13px] leading-[19px] text-bone/75">Tentative, from one photo. Ask a local agriculture officer what to do before spraying.</p>
              </div>
              <p className="label mt-5 !text-madder">03</p>
              <h3 className="display mt-1 text-[30px]">You get a short report</h3>
              <p className="mt-2 max-w-[24rem] text-[15px] leading-[23px] text-ink-2">A tentative name, the symptoms it reported, prevention steps, and a pointer to a local agriculture officer.</p>
            </li>
          </ol>
        </div>
      </section>

      {/* LIMITS */}
      <section id="limits" className="dark-surface bg-leaf">
        <div className="mx-auto grid max-w-[1320px] gap-12 px-6 py-24 sm:px-10 sm:py-32 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="label">What it does not do</p>
            <h2 className="display mt-5 text-[44px] sm:text-[72px]">Honest about <em className="text-lime">limits.</em></h2>
          </div>
          <ul className="divide-y divide-bone/20 border-y border-bone/20">
            {LIMITS.map((l) => (
              <li key={l} className="scroll-rise py-6 text-[18px] leading-[28px] text-bone/90 sm:text-[21px] sm:leading-[31px]">{l}</li>
            ))}
          </ul>
        </div>
        <div className="mx-auto max-w-[1320px] px-6 pb-24 sm:px-10">
          <Link href="/scan" className="inline-flex h-14 items-center gap-3 rounded-full bg-lime px-8 text-[16px] font-medium text-night transition-transform active:scale-[0.98]">
            Scan a leaf <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="dark-surface bg-night">
        <div className="mx-auto max-w-[1320px] px-6 py-8 sm:px-10">
          <p className="label !normal-case !tracking-normal">
            Photo: &ldquo;Early blight on tomato leaves&rdquo; by Dwight Sipler, licensed{' '}
            <a className="underline" href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>, via{' '}
            <a className="underline" href="https://commons.wikimedia.org/wiki/File:Early_blight_on_tomato_leaves_(7871930010).jpg">Wikimedia Commons</a>. Cropped and darkened for layout. Shown as scenery and a sample layout, not as a reading by AgriSense.
          </p>
        </div>
      </footer>
    </div>
  );
}
