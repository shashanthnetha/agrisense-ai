'use client';
import { useState } from 'react';
import { Checkbox } from 'radix-ui';
import { Check, Printer } from 'lucide-react';

const GROUPS = [
  { title: 'Bring', items: ['The leaf, or clear photos of it and of the whole plant', 'Crop, variety and how old the plants are', 'When you first noticed it, and how fast it is spreading', 'Recent rain, irrigation and anything already sprayed', 'The AgriSense report, as a screenshot'] },
  { title: 'Ask', items: ['Is this really the disease the photo resembles?', 'What is approved for this crop, and how long before harvest?', 'Is there an organic or non-spray option?', 'Should I remove or separate affected plants?'] },
];

export function Checklist() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const total = GROUPS.reduce((a, g) => a + g.items.length, 0);
  const count = Object.values(done).filter(Boolean).length;
  return (
    <div>
      <div className="grid gap-10 md:grid-cols-2 md:gap-14">
        {GROUPS.map((g) => (
          <fieldset key={g.title}>
            <legend className="label !text-signal">{g.title}</legend>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {g.items.map((it) => {
                const id = `${g.title}-${it}`;
                return (
                  <li key={it}>
                    <label className="flex min-h-14 cursor-pointer items-start gap-4 py-4">
                      <Checkbox.Root checked={!!done[id]} onCheckedChange={(c) => setDone((d) => ({ ...d, [id]: c === true }))} className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-[4px] border border-ink bg-sheet data-[state=checked]:bg-ink">
                        <Checkbox.Indicator><Check className="h-4 w-4 text-sheet" strokeWidth={2.5} aria-hidden /></Checkbox.Indicator>
                      </Checkbox.Root>
                      <span className={`text-[16px] leading-[24px] ${done[id] ? 'text-ink-3 line-through decoration-ink-3/50' : ''}`}>{it}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        ))}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-4">
        <button type="button" onClick={() => window.print()} className="btn-line"><Printer className="h-4 w-4" aria-hidden /> Print this list</button>
        <p className="label" aria-live="polite">{count} of {total} ready</p>
      </div>
    </div>
  );
}
