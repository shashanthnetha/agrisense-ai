import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { PageHero } from '@/components/site/PageHero';
import { PhotoTester } from '@/components/site/PhotoTester';

export const metadata: Metadata = { title: 'Photo guide | AgriSense AI' };

const STEPS = [
  ['Pick one leaf', 'Choose a leaf that shows the symptoms. One leaf reads better than a whole plant.'],
  ['Get into daylight', 'Open shade or soft daylight. Avoid flash and deep shadow.'],
  ['Come in close', 'About 10 to 15 cm, so the leaf fills the frame.'],
  ['Hold still, then shoot', 'Brace your elbow, tap the leaf to focus, and take two or three.'],
];

export default function Guide() {
  return (
    <div className="bg-sheet text-ink">
      <SiteHeader tone="dark" />
      <main id="main">
        <PageHero label="Photo guide" title="A clear photo gives the model more to read.">Pick a problem to see what it does to the same leaf.</PageHero>
        <div className="wrap py-10 sm:py-16">
        <div><PhotoTester /></div>

        <h2 className="head page-h2 mt-20">Four steps in the field</h2>
        <ol className="mt-8 divide-y divide-line border-y border-line">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="grid grid-cols-[3rem_1fr] gap-4 py-6 sm:grid-cols-[4rem_14rem_1fr]">
              <span className="font-mono text-[13px] text-signal">{String(i + 1).padStart(2, '0')}</span>
              <span className="head text-[20px]">{t}</span>
              <span className="col-start-2 text-[16px] leading-[24px] text-ink-2 sm:col-start-auto">{d}</span>
            </li>
          ))}
        </ol>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
