import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Wordmark } from "@/components/site/Wordmark";
import { LeafPlate } from "@/components/site/LeafPlate";

const STEPS = [
  { n: "01", title: "Photograph", body: "One affected leaf, in daylight, filling most of the frame." },
  { n: "02", title: "Read", body: "The photo is read for crop, visible symptoms and how much of the leaf is affected." },
  { n: "03", title: "Report", body: "A short report with the likely disease, what to do first, organic steps and prevention." },
  { n: "04", title: "Listen", body: "When audio is enabled for this demo, a short spoken summary of the result is available in English, Hindi, Tamil or Telugu." },
];

const LIMITS = [
  ["No pesticide products or doses", "The report does not name chemicals or rates. Ask a local agriculture officer before you spray."],
  ["The confidence figure is the model's own", "It is a self-reported estimate for one photo. It has not been tested against a labelled set of leaves."],
  ["No recovery forecast", "Nothing in the report predicts how long a crop will take to recover."],
  ["Limited coverage", "Guidance comes from a knowledge base of 50 diseases and pests, so some problems are not covered yet."],
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Wordmark />
        <nav className="flex items-center gap-6 text-[14px]" aria-label="Main">
          <Link href="#how" className="hidden text-ink-2 transition-colors hover:text-ink sm:inline">How it works</Link>
          <Link href="#limits" className="hidden text-ink-2 transition-colors hover:text-ink sm:inline">What it does not do</Link>
          <Link href="/scan" className="inline-flex h-9 items-center rounded-lg bg-ink px-4 text-[14px] font-medium text-paper transition-colors hover:bg-ink/85">
            Scan a leaf
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-6 pb-20 pt-12 lg:min-h-[calc(100vh-64px)] lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-12">
          <div className="rise">
            <p className="label mb-6">Crop disease check for farmers</p>
            <h1 className="max-w-[12ch] text-[44px] leading-[1.04] tracking-[-0.02em] sm:text-[56px] lg:text-[68px]">
              A field report for a sick leaf, from one photo
            </h1>
            <p className="mt-6 max-w-[34rem] text-[18px] leading-[28px] text-ink-2">
              Photograph the affected leaf. AgriSense names the likely disease, lists the symptoms it saw, and sets out the organic and prevention steps.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href="/scan" className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-ink px-6 text-[15px] font-medium text-paper transition-[transform,background-color] duration-150 hover:bg-ink/85 active:scale-[0.98]">
                Scan a leaf <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
              </Link>
              <Link href="#how" className="text-[15px] text-ink underline decoration-line decoration-1 underline-offset-[6px] transition-colors hover:decoration-ink">
                See how it works
              </Link>
            </div>
          </div>
          <div className="rise rise-2 mx-auto w-full max-w-[520px] lg:max-w-none">
            <LeafPlate />
          </div>
        </section>

        <section id="how" className="border-t border-line">
          <div className="reveal mx-auto max-w-[1200px] px-6 py-24">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <h2 className="max-w-[14ch] text-[36px] leading-[1.1] tracking-[-0.02em] sm:text-[44px]">From the field to a plan in four steps</h2>
              <ol className="divide-y divide-line border-y border-line">
                {STEPS.map((s) => (
                  <li key={s.n} className="grid grid-cols-[48px_1fr] gap-4 py-6 sm:grid-cols-[64px_180px_1fr]">
                    <span className="label tnum pt-1">{s.n}</span>
                    <h3 className="text-[22px] leading-[28px]">{s.title}</h3>
                    <p className="col-span-2 text-[15px] leading-[22px] text-ink-2 sm:col-span-1">{s.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section id="limits" className="bg-night text-[#efe9de]">
          <div className="reveal mx-auto max-w-[1200px] px-6 py-24">
            <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
              <div>
                <h2 className="max-w-[14ch] text-[36px] leading-[1.1] tracking-[-0.02em] sm:text-[44px]">What it does not do</h2>
                <p className="mt-4 max-w-[28rem] text-[16px] leading-[24px] text-[#a9a194]">
                  A photo check helps you decide what to look at next. It does not replace someone who can walk your field.
                </p>
              </div>
              <dl className="divide-y divide-white/10 border-y border-white/10">
                {LIMITS.map(([t, b]) => (
                  <div key={t} className="grid gap-2 py-6 sm:grid-cols-[260px_1fr] sm:gap-8">
                    <dt className="text-[17px] leading-[24px]">{t}</dt>
                    <dd className="text-[15px] leading-[22px] text-[#a9a194]">{b}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        <section className="reveal mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-8 px-6 py-24 sm:flex-row sm:items-center">
          <h2 className="max-w-[18ch] text-[32px] leading-[1.12] tracking-[-0.02em] sm:text-[40px]">Have a leaf in front of you? Start with a photo</h2>
          <Link href="/scan" className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-ink px-6 text-[15px] font-medium text-paper transition-[transform,background-color] duration-150 hover:bg-ink/85 active:scale-[0.98]">
            Scan a leaf <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          </Link>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col items-start justify-between gap-4 px-6 py-8 sm:flex-row sm:items-center">
          <Wordmark />
          <p className="label">AI-assisted guidance, not a replacement for a local agriculture officer</p>
        </div>
      </footer>
    </div>
  );
}
