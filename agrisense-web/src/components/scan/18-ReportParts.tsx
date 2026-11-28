'use client';

import React, { useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';

/* Prevention tips you can tick off while you work. Kept on this screen only. */
export function TipChecklist({ tips }: { tips: string[] }) {
  const [done, setDone] = useState<Record<number, boolean>>({});
  const n = Object.values(done).filter(Boolean).length;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <p className="label">Prevention</p>
        <p className="label tnum" aria-live="polite">{n} of {tips.length} done</p>
      </div>
      <ul className="mt-2 divide-y divide-bone/20 border-y border-bone/20">
        {tips.map((t, i) => (
          <li key={i}>
            <label className="flex min-h-12 cursor-pointer items-start gap-3.5 py-3 text-[15px] leading-[22px] text-bone/90">
              <input
                type="checkbox"
                checked={!!done[i]}
                onChange={(e) => setDone((p) => ({ ...p, [i]: e.target.checked }))}
                className="peer sr-only"
              />
              <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-[5px] border border-bone/50 text-night transition-colors peer-checked:border-lime peer-checked:bg-lime peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-lime" aria-hidden>
                {done[i] && <Check className="h-3.5 w-3.5" strokeWidth={2.5} />}
              </span>
              <span className={done[i] ? 'text-bone/55 line-through decoration-bone/30' : ''}>{t}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* A plain-text note to show a local agriculture officer. Same caveats as the screen. */
export function SummaryActions({ text }: { text: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 2500);
  };
  const share = async () => {
    try { await navigator.share({ title: 'AgriSense leaf reading', text }); } catch { /* cancelled */ }
  };
  const b = 'inline-flex h-11 items-center gap-2 rounded-full border border-ink/25 px-4 text-[14px] text-ink transition-colors hover:bg-ink/5';
  return (
    <div className="rounded-[6px] border border-line p-4 sm:p-5">
      <p className="label">Take it to an officer</p>
      <p className="mt-2 text-[14px] leading-[21px] text-ink-2">A short note with the reading and its limits, to show or send to a local agriculture officer.</p>
      <details className="group mt-3">
        <summary className="cursor-pointer list-none text-[13px] text-ink-3 underline underline-offset-4">Preview the note</summary>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg bg-ink/[0.04] p-3 font-sans text-[13px] leading-[20px] text-ink-2">{text}</pre>
      </details>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className={b}>
          {state === 'copied' ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {state === 'copied' ? 'Copied' : 'Copy note'}
        </button>
        {canShare && <button type="button" onClick={share} className={b}><Share2 className="h-4 w-4" aria-hidden /> Share</button>}
      </div>
      <p className="mt-2 text-[13px] text-ink-3" role="status" aria-live="polite">{state === 'copied' ? 'Note copied.' : state === 'failed' ? 'Could not copy. Open the preview and select the text.' : ''}</p>
    </div>
  );
}
