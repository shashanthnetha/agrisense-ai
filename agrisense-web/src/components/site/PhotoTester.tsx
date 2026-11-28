'use client';
import { useState } from 'react';
import { Tabs } from 'radix-ui';

const CASES = [
  { id: 'good', label: 'Good', title: 'Easier to read', rule: 'One leaf fills the frame. The spots are sharp. Daylight, no deep shadow.', style: {} as React.CSSProperties, ok: true },
  { id: 'dark', label: 'Too dark', title: 'Hard to read reliably', rule: 'Shadow hides the colour changes around a spot. Step into open daylight or shade, and avoid flash.', style: { filter: 'brightness(0.32) contrast(1.1)' }, ok: false },
  { id: 'far', label: 'Too far', title: 'Hard to read reliably', rule: 'From a metre away the spots shrink to a few pixels. Come in to about 10 to 15 cm and fill the frame.', style: { transform: 'scale(0.42)' }, ok: false },
  { id: 'blur', label: 'Blurry', title: 'Hard to read reliably', rule: 'Spot edges disappear when the phone moves. Brace your elbow, tap the leaf to focus, then shoot.', style: { filter: 'blur(7px)' }, ok: false },
  { id: 'glare', label: 'Harsh sun', title: 'Hard to read reliably', rule: 'Direct midday sun bleaches the leaf and washes out the yellow halo. Shade the leaf with your body.', style: { filter: 'brightness(1.7) contrast(0.55) saturate(0.6)' }, ok: false },
];

export function PhotoTester() {
  const [v, setV] = useState('good');
  const c = CASES.find((x) => x.id === v)!;
  return (
    <Tabs.Root value={v} onValueChange={setV} className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-14">
      <div>
        <div className="relative aspect-[1920/1285] w-full overflow-hidden rounded-[4px] bg-[#1a1a14]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/early-blight-sample.jpg" alt="The same sample tomato leaf photo, changed to show the selected photo problem" className="h-full w-full object-cover transition-[filter,transform] duration-500 ease-out" style={c.style} />
          <span aria-hidden className="pointer-events-none absolute inset-[10%] border border-sheet/60" />
          {['left-[10%] top-[10%] border-l-2 border-t-2', 'right-[10%] top-[10%] border-r-2 border-t-2', 'left-[10%] bottom-[10%] border-b-2 border-l-2', 'right-[10%] bottom-[10%] border-b-2 border-r-2'].map((k) => (
            <span key={k} aria-hidden className={`pointer-events-none absolute h-6 w-6 border-lime ${k}`} />
          ))}
        </div>
        <p className="label mt-3 !text-ink-3">Same sample photo each time. Altered here to show the problem, not a real scan.</p>
      </div>
      <div>
        <Tabs.List aria-label="Photo problems" className="flex flex-wrap gap-2">
          {CASES.map((k) => (
            <Tabs.Trigger key={k.id} value={k.id} className="h-11 rounded-full border border-line px-4 text-[14px] text-ink-2 transition-colors hover:bg-raised data-[state=active]:border-ink data-[state=active]:bg-ink data-[state=active]:text-sheet">
              {k.label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {CASES.map((k) => (
          <Tabs.Content key={k.id} value={k.id} className="mt-7 outline-offset-8">
            <p className={`label ${k.ok ? '!text-field' : '!text-signal'}`}>{k.title}</p>
            <p className="head mt-3 text-[26px] sm:text-[30px]">{k.rule}</p>
          </Tabs.Content>
        ))}
      </div>
    </Tabs.Root>
  );
}
