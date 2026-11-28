'use client';
import { useState } from 'react';

const PARTS = [
  { n: 1, name: 'A tentative name', text: 'The disease the photo most resembles, worded as "looks like", never as a diagnosis.' },
  { n: 2, name: 'The symptoms it reported', text: 'Plain words for what the model says it can see: spots, colour changes, edges.' },
  { n: 3, name: 'What to do now', text: 'Always a pointer to a local agriculture officer first. No sprays, no doses.' },
  { n: 4, name: 'Its own estimates', text: 'Confidence and affected area, shown small and labelled as the model\u2019s own figures, not measurements.' },
];

export function ReportAnatomy() {
  const [on, setOn] = useState(1);
  const hl = (n: number) => `rounded-[3px] transition-colors duration-200 ${on === n ? 'bg-lime/45 ring-4 ring-lime/45' : ''}`;
  return (
    <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-16">
      <div className="rounded-[4px] border border-ink/70 bg-card p-5 sm:p-7">
        <p className="label flex justify-between !text-ink-3"><span>Sample report</span><span>Illustrative</span></p>
        <div className="mt-5 space-y-5">
          <div className={hl(1)}><span className="font-mono text-[11px] text-signal">1</span>
            <p className="text-[15px] italic text-ink-2">Looks like</p>
            <p className="head text-[34px]">Early blight</p></div>
          <div className={hl(2)}><span className="font-mono text-[11px] text-signal">2</span>
            <p className="text-[15px] leading-[22px]">Dark spots with ring-like markings. Yellowing around the spots.</p></div>
          <div className={`${hl(3)} border-t border-line pt-4`}><span className="font-mono text-[11px] text-signal">3</span>
            <p className="label !text-signal">What now</p>
            <p className="mt-1 text-[15px] leading-[22px]">Ask a local agriculture officer what to do for this crop before spraying anything.</p></div>
          <div className={`${hl(4)} border-t border-line pt-4`}><span className="font-mono text-[11px] text-signal">4</span>
            <p className="text-[12.5px] leading-[18px] text-ink-3">Model&rsquo;s own estimate, not a measurement. Layout example only, not a reading of any photo.</p></div>
        </div>
      </div>
      <ol className="divide-y divide-line border-y border-line">
        {PARTS.map((p) => (
          <li key={p.n}>
            <button type="button" onMouseEnter={() => setOn(p.n)} onFocus={() => setOn(p.n)} onClick={() => setOn(p.n)} aria-pressed={on === p.n} className="grid w-full grid-cols-[2rem_1fr] gap-3 py-5 text-left">
              <span className={`font-mono text-[13px] ${on === p.n ? 'text-signal' : 'text-ink-3'}`}>{p.n}</span>
              <span>
                <span className="head block text-[20px]">{p.name}</span>
                <span className="mt-1 block max-w-[46ch] text-[15px] leading-[23px] text-ink-2">{p.text}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
