'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { SiteHeader } from '@/components/site/SiteHeader';
import { PageHero } from '@/components/site/PageHero';
import { SiteFooter } from '@/components/site/SiteFooter';
import { ResultStory } from '@/components/scan/ResultStory';
import { browserStore, clearHistory, deleteReport, loadHistory, MAX_ENTRIES, SavedReport } from '@/lib/history';

const when = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
};

export default function HistoryPage() {
  const [items, setItems] = useState<SavedReport[] | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);

  useEffect(() => {
    // localStorage exists only in the browser, so it is read after mount (keeps server and client markup equal).
    const store = browserStore();
    /* eslint-disable react-hooks/set-state-in-effect */
    setBlocked(!store);
    setItems(loadHistory(store));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const refresh = () => setItems(loadHistory(browserStore()));
  const opened = items?.find((r) => r.id === openId) ?? null;

  if (opened) {
    const day = new Date(opened.savedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    return (
      <div className="bg-sheet text-ink">
        <SiteHeader tone="dark" />
        <main id="main">
          <ResultStory
            analysis={opened.analysis}
            treatment={opened.treatment}
            treatmentMessage={opened.treatmentMessage}
            knowledgeMatch={opened.knowledgeMatch}
            photo={null}
            reportDate={day}
          />
        </main>
        <div className="wrap pb-16 sm:pb-20">
          <div className="flex flex-col gap-3 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="label max-w-[42ch]">Saved on this device only, text only</p>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button type="button" className="btn-line flex-1 justify-center sm:flex-none" onClick={() => { deleteReport(opened.id, browserStore()); setOpenId(null); refresh(); }}>Delete this report</button>
              <button type="button" className="btn-ink flex-1 justify-center sm:flex-none" onClick={() => setOpenId(null)}>Back to history</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-sheet text-ink">
      <SiteHeader tone="dark" />
      <main id="main">
        <PageHero label="History" title="Your scans." />
        <div className="wrap py-10 sm:py-16">
          <p className="max-w-[40rem] text-[15px] leading-[23px] text-ink-2">
            The last {MAX_ENTRIES} reports are kept as text on this device only. Photos are never saved. Clearing your browser data, or using another phone or browser, removes or hides them.
          </p>
          {blocked && (
            <p role="alert" className="mt-4 max-w-[40rem] rounded-[4px] border border-line px-4 py-3 text-[14px] leading-[22px]">
              This browser is blocking storage (private mode, for example), so reports cannot be saved here.
            </p>
          )}
          {items === null ? null : items.length === 0 ? (
            <div className="mt-8 rounded-[4px] border border-line px-6 py-14 sm:py-16">
              <p className="font-serif text-[28px] leading-[32px]">No scans saved yet</p>
              <p className="mt-3 max-w-[26rem] text-[15px] leading-[23px] text-ink-2">Your next report will appear here, as text, on this device.</p>
              <Link href="/scan" className="mt-8 inline-flex h-12 items-center rounded-full bg-ink px-6 text-[15px] font-medium text-sheet transition-transform active:scale-[0.98]">Scan a leaf</Link>
            </div>
          ) : (
            <>
              <ul className="mt-8 divide-y divide-line border-y border-line">
                {items.map((r) => (
                  <li key={r.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words font-serif text-[22px] leading-[28px]">{r.analysis.disease_detected ? r.analysis.disease_name : 'No disease seen'}</p>
                      <p className="mt-1 text-[14px] text-ink-2">{r.analysis.crop_type} · {when(r.savedAt)} · {Math.round(r.analysis.confidence)}% model confidence</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" className="btn-ink !min-h-10 text-[14px]" onClick={() => setOpenId(r.id)} aria-label={`Reopen report: ${r.analysis.crop_type}, ${when(r.savedAt)}`}>Reopen</button>
                      <button type="button" className="btn-line !min-h-10 text-[14px]" onClick={() => { deleteReport(r.id, browserStore()); refresh(); }} aria-label={`Delete report: ${r.analysis.crop_type}, ${when(r.savedAt)}`}>Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                {confirmAll ? (
                  <div className="flex flex-wrap items-center gap-3 text-[14px]">
                    <span>Delete all {items.length} saved reports?</span>
                    <button type="button" className="btn-ink !min-h-10" onClick={() => { clearHistory(browserStore()); setConfirmAll(false); refresh(); }}>Yes, delete all</button>
                    <button type="button" className="btn-line !min-h-10" onClick={() => setConfirmAll(false)}>Keep them</button>
                  </div>
                ) : (
                  <button type="button" className="btn-line !min-h-10 text-[14px]" onClick={() => setConfirmAll(true)}>Delete all</button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
