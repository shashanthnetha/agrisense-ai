import type { Metadata } from 'next';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { Checklist } from '@/components/site/Checklist';

export const metadata: Metadata = { title: 'Before you spray | AgriSense AI' };

const DOES = ['Names the disease the photo most resembles, as a tentative reading', 'Lists the symptoms the model says it can see', 'Points you to a local agriculture officer'];
const DOESNT = ['Give a diagnosis', 'Mark where on the leaf the problem is', 'Prescribe sprays or doses', 'Measure anything: confidence and affected area are the model\u2019s own estimates'];

export default function Limits() {
  return (
    <div className="bg-sheet text-ink">
      <SiteHeader />
      <main className="wrap py-10 sm:py-16">
        <p className="label !text-signal">Before you spray</p>
        <h1 className="head page-h1 mt-4 max-w-[20ch]">What AgriSense can and can&rsquo;t tell you.</h1>

        <div className="mt-10 grid gap-px overflow-hidden rounded-[4px] border border-line bg-line md:grid-cols-2">
          <div className="bg-sheet p-6 sm:p-8">
            <p className="label !text-field">It does</p>
            <ul className="mt-4 space-y-3">{DOES.map((t) => <li key={t} className="text-[16px] leading-[24px]">{t}</li>)}</ul>
          </div>
          <div className="bg-sheet p-6 sm:p-8">
            <p className="label !text-signal">It does not</p>
            <ul className="mt-4 space-y-3">{DOESNT.map((t) => <li key={t} className="text-[16px] leading-[24px]">{t}</li>)}</ul>
          </div>
        </div>

        <h2 className="head page-h2 mt-20">Take this to your officer</h2>
        <p className="mt-3 max-w-[40rem] text-[16px] leading-[25px] text-ink-2">Tick things off as you get them ready. You can print the list.</p>
        <div className="mt-8"><Checklist /></div>
      </main>
      <SiteFooter />
    </div>
  );
}
