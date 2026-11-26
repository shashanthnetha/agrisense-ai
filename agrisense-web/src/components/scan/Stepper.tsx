import React from 'react';
import { Check } from 'lucide-react';

const STEPS = ['Photo', 'Analyze', 'Result'];

export function Stepper({ current }: { current: 0 | 1 | 2 }) {
  return (
    <ol className="flex items-center justify-center gap-2 text-xs font-medium" aria-label="Scan progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${
                done
                  ? 'border-green-700 bg-green-700 text-white'
                  : active
                  ? 'border-green-700 bg-green-50 text-green-800'
                  : 'border-slate-300 bg-white text-slate-400'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={active ? 'text-slate-900' : done ? 'text-slate-600' : 'text-slate-400'}>{label}</span>
            {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-slate-300" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
