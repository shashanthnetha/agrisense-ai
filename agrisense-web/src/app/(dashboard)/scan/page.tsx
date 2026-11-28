'use client';

import React, { useState, useEffect } from 'react';
import { ImageUploader } from '@/components/scan/ImageUploader';
import { ResultStory } from '@/components/scan/ResultStory';
import { VoicePlayer } from '@/components/scan/VoicePlayer';
import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { analyzeCrop, getScanStatus, ACCESS_KEY_STORAGE, ScanStatus } from '@/lib/api';
import { ScanResponse } from '@/lib/types';
import { toast } from 'sonner';
import Link from 'next/link';
import { VolumeX } from 'lucide-react';

const TIPS = [
  'Use daylight and avoid shadows',
  'Frame one leaf that shows the symptoms',
  'Hold the camera 10 to 15 cm away and keep it steady',
  'Skip blurry or very dark photos',
];

function PausedPlate({ state }: { state: ScanStatus['state'] }) {
  return (
    <div role="status" className="rounded-[6px] border border-bone/25 bg-bone/[0.04] px-6 py-16 sm:py-20">
      <p className="label">Scanning availability</p>
      <h2 className="head mt-4 max-w-[16ch] text-[34px] sm:text-[44px]">
        {state === 'closed' ? <>This demo has closed.</> : <>Scanning is paused right now.</>}
      </h2>
      <p className="mt-4 max-w-[24rem] text-[15px] leading-[23px] text-bone/75">
        {state === 'closed'
          ? 'The public demo window has ended, so new photos are not being read. This page will open again if a new window is announced.'
          : 'New photos are not being read at the moment. Please check back later.'}
      </p>
    </div>
  );
}

export default function ScanPage() {
  const [result, setResult] = useState<ScanResponse | null>(null);
  // knowledge_match 'none' means the reference notes had nothing for this reading: never show a plan or play audio for it, even if a server sent one.
  const hasPlan = !!result?.treatment && result?.knowledge_match !== 'none';
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('English');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [accessKey, setAccessKey] = useState<string>('');
  const [status, setStatus] = useState<ScanStatus | null>(null);

  useEffect(() => {
    setAccessKey(window.localStorage.getItem(ACCESS_KEY_STORAGE) || '');
    getScanStatus().then(setStatus);
  }, []);

  useEffect(() => {
    return () => {
      if (photo) URL.revokeObjectURL(photo);
    };
  }, [photo]);

  // A failure or "no reliable result" must be seen: bring it into view (and keep it out of the hidden area behind the photo).
  useEffect(() => {
    if (!notice && !error) return;
    document.getElementById('scan-feedback')?.scrollIntoView({ block: 'center' });
  }, [notice, error]);

  const saveAccessKey = (value: string) => {
    setAccessKey(value);
    window.localStorage.setItem(ACCESS_KEY_STORAGE, value.trim());
  };

  // Unknown status (endpoint unreachable) still lets a visitor try; the API's own gate answers honestly.
  const canScan = !status || status.open;

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    setNotice(null);
    setLastFile(file);
    try {
      const data = await analyzeCrop(file, language);
      if (!data || !['healthy', 'disease_detected', 'not_a_plant', 'uncertain'].includes(data.status)) {
        throw new Error('Unexpected response from server');
      }
      if (data.status === 'not_a_plant' || data.status === 'uncertain') {
        setNotice(data.message || 'We could not give a reliable result for this photo. Please try a clearer photo.');
        return;
      }
      setPhoto(URL.createObjectURL(file));
      setResult(data);
      window.scrollTo({ top: 0 });
      toast.success('Report ready');
    } catch (err: unknown) {
      console.error(err);
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      const detailText = (typeof detail === 'string' && detail) || '';
      // The gate refused mid-session: re-read the status and move to the closed screen instead of a dead retry.
      if (/not open right now|demo has closed/i.test(detailText)) {
        const fresh = await getScanStatus();
        if (fresh && !fresh.open) {
          setStatus(fresh);
          return;
        }
      }
      if (status === 400 || status === 413 || status === 429) {
        // The photo or the allowance is the problem: pass the server's own guidance.
        setError(detailText || 'We could not analyze this image. Please try again.');
      } else {
        // Service or network failure: do not blame the photo; it stays selected for the retry.
        setError('The service could not finish reading that photo just now. That is a service problem, not the photo. Please try again in a moment.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setPhoto(null);
    setError(null);
    setNotice(null);
  };

  const reportDate = result ? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null;

  const audio = result && hasPlan && result.treatment ? (
    status?.voice_available ? (
      <VoicePlayer analysis={result.analysis} treatment={result.treatment} language={language} />
    ) : status ? (
      <p className="flex max-w-[30rem] items-center gap-3 text-[14px] leading-[20px] text-ink-2">
        <VolumeX className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
        Audio is off for this demo. When it is on, it plays a short spoken summary of the result, not this full plan.
      </p>
    ) : null
  ) : null;

  return (
    <div data-scan-page className={'min-h-screen bg-sheet text-ink'}>
      <SiteHeader tone="dark" />

      <main id="main" className={result ? 'pb-4' : 'wrap py-8 sm:py-12'}>
        {!result ? (
          <div className="dark-surface grid gap-10 rounded-[8px] bg-night p-6 text-bone sm:p-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-14 lg:p-14">
            <div>
              <p className="label rise">New scan</p>
              <h1 className="head page-h1 mt-4">Scan a leaf.</h1>
              <p className="rise mt-5 max-w-[26rem] text-[16px] leading-[25px] text-bone/75" style={{ '--d': '220ms' } as React.CSSProperties}>
                One photo in, a tentative identification and next steps out. Confirm with a local agriculture officer.
              </p>
              <ul aria-label="For a clearer result" className="rise mt-8 max-w-[28rem]" style={{ '--d': '380ms' } as React.CSSProperties}>
                {TIPS.map((t, i) => (
                  <li key={t} className="flex gap-4 border-t border-bone/20 py-3 text-[14px] leading-[20px] text-bone/75">
                    <span className="font-mono text-[11px] leading-[20px] text-bone/50">{String(i + 1).padStart(2, '0')}</span>{t}
                  </li>
                ))}
              </ul>
              {status?.access_key_accepted && (
                <div className="rise mt-8 max-w-[20rem]" style={{ '--d': '440ms' } as React.CSSProperties}>
                  <label htmlFor="access-key" className="label block">Access key (needed to scan)</label>
                  <input id="access-key" type="password" autoComplete="off" value={accessKey} onChange={(e) => saveAccessKey(e.target.value)} className="mt-2 h-10 w-full rounded-lg border border-bone/30 bg-night px-3 text-[14px] text-bone" />
                </div>
              )}
            </div>

            <div className="rise" style={{ '--d': '300ms' } as React.CSSProperties}>
              {canScan ? (
                <ImageUploader onUpload={handleUpload} isLoading={isLoading} language={language} onLanguageChange={setLanguage} showLanguage={!!status?.voice_available} />
              ) : (
                status && <PausedPlate state={status.state} />
              )}

              {notice && (
                <div id="scan-feedback" role="status" className="mt-4 border-l-2 border-[#ff9a62] bg-bone/[0.06] p-4">
                  <p className="text-[15px]">No reliable result</p>
                  <p className="mt-1 text-[14px] leading-[20px] text-bone/75">{notice}</p>
                </div>
              )}

              {error && (
                <div id="scan-feedback" role="alert" className="mt-4 border-l-2 border-[#ff9a62] bg-bone/[0.06] p-4">
                  <p className="text-[15px]">Analysis failed</p>
                  <p className="mt-1 text-[14px] leading-[20px] text-bone/75">{error}</p>
                  {lastFile && canScan && (
                    <button type="button" disabled={isLoading} onClick={() => handleUpload(lastFile)} className="mt-3 inline-flex h-10 items-center rounded-full border border-bone/40 px-4 text-[14px] transition-colors hover:bg-bone/10 disabled:opacity-50">
                      Try again
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ResultStory
            analysis={result.analysis}
            treatment={hasPlan ? result.treatment : null}
            treatmentMessage={result.treatment_message}
            knowledgeMatch={result.knowledge_match}
            photo={photo}
            reportDate={reportDate}
            audio={audio}
          />
        )}
      </main>

      {!result && <SiteFooter />}

      {result && (
        <div className="wrap pb-16 sm:pb-20">
          <div className="flex flex-col gap-3 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
            <p className="label max-w-[42ch]">AI-assisted guidance, not a replacement for a local agriculture officer</p>
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <Link href="/history" className="btn-line shrink-0">History</Link>
              <button type="button" onClick={reset} className="btn-ink flex-1 justify-center sm:flex-none">Scan another leaf</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
