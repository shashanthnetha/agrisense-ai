'use client';

import React, { useState, useEffect } from 'react';
import { ImageUploader } from '@/components/scan/ImageUploader';
import { AnalysisResults } from '@/components/scan/AnalysisResults';
import { TreatmentPlan } from '@/components/scan/TreatmentPlan';
import { VoicePlayer } from '@/components/scan/VoicePlayer';
import { Wordmark } from '@/components/site/Wordmark';
import { analyzeCrop, getScanStatus, ACCESS_KEY_STORAGE, ScanStatus } from '@/lib/api';
import { ScanResponse } from '@/lib/types';
import { toast } from 'sonner';
import Link from 'next/link';
import { VolumeX } from 'lucide-react';
import { treatmentVerified } from '@/lib/advice';

const TIPS = [
  'Use daylight and avoid shadows',
  'Frame one leaf that shows the symptoms',
  'Hold the camera 10 to 15 cm away and keep it steady',
  'Skip blurry or very dark photos',
];

const URGENCY_DOT: Record<string, string> = {
  Low: 'bg-moss',
  Medium: 'bg-[#7a5200]',
  High: 'bg-madder',
  Critical: 'bg-madder',
};

const primary = 'inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 text-[15px] font-medium text-paper transition-[transform,background-color] duration-150 hover:bg-ink/85 active:scale-[0.98] disabled:opacity-50';

function PausedPlate({ state }: { state: ScanStatus['state'] }) {
  return (
    <div role="status" className="relative rounded-2xl border border-line bg-card px-6 py-16 text-center sm:py-24">
      <p className="label">Scanning availability</p>
      <h2 className="mt-3 text-[28px] leading-[32px] tracking-[-0.01em]">
        {state === 'closed' ? 'This demo has closed' : 'Scanning is paused right now'}
      </h2>
      <p className="mx-auto mt-2 max-w-[22rem] text-[15px] leading-[22px] text-ink-2">
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

  const sick = !!result?.analysis?.disease_detected;
  const reportDate = result ? new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  // Immediate action is treatment advice: only a source-verified record may show it.
  const leadAction = treatmentVerified(result?.treatment) ? result?.treatment?.immediate_action?.trim() : '';

  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Wordmark />
        <nav aria-label="Main" className="flex items-center gap-6 text-[14px]">
          <Link href="/history" className="text-ink-2 transition-colors hover:text-ink">History</Link>
        </nav>
      </header>

      <main className="mx-auto max-w-[1200px] px-6 pb-24 pt-8">
        {!result ? (
          <div className="rise grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
            <div>
              {canScan ? (
                <ImageUploader onUpload={handleUpload} isLoading={isLoading} language={language} onLanguageChange={setLanguage} showLanguage={!!status?.voice_available} />
              ) : (
                status && <PausedPlate state={status.state} />
              )}

              {notice && (
                <div role="status" className="mt-4 border-l-2 border-[#7a5200] bg-card p-4">
                  <p className="text-[15px]">No reliable result</p>
                  <p className="mt-1 text-[14px] leading-[20px] text-ink-2">{notice}</p>
                </div>
              )}

              {error && (
                <div role="alert" className="mt-4 border-l-2 border-madder bg-card p-4">
                  <p className="text-[15px]">Analysis failed</p>
                  <p className="mt-1 text-[14px] leading-[20px] text-ink-2">{error}</p>
                  {lastFile && canScan && (
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleUpload(lastFile)}
                      className="mt-3 inline-flex h-10 items-center rounded-lg border border-line bg-paper px-4 text-[14px] transition-colors hover:bg-raised disabled:opacity-50"
                    >
                      Try again
                    </button>
                  )}
                </div>
              )}
            </div>

            <aside className="lg:pt-6">
              <p className="label">New scan</p>
              <h1 className="mt-3 max-w-[14ch] text-[40px] leading-[1.06] tracking-[-0.02em] sm:text-[48px]">Scan your crop</h1>
              <p className="mt-4 max-w-[28rem] text-[16px] leading-[24px] text-ink-2">
                Get an AI-assisted check of a leaf from one photo.
              </p>

              <h2 className="mt-10 text-[20px] leading-[28px]">For a clearer result</h2>
              <ol className="mt-3 divide-y divide-line border-y border-line">
                {TIPS.map((t, i) => (
                  <li key={t} className="grid grid-cols-[32px_1fr] py-3 text-[15px] leading-[22px] text-ink-2">
                    <span className="label tnum pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                    {t}
                  </li>
                ))}
              </ol>

              {status?.access_key_accepted && (
                <div className="mt-10">
                  <label htmlFor="access-key" className="label block">Access key (needed to scan)</label>
                  <input
                    id="access-key"
                    type="password"
                    autoComplete="off"
                    value={accessKey}
                    onChange={(e) => saveAccessKey(e.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-line bg-card px-3 text-[14px] text-ink"
                  />
                </div>
              )}
            </aside>
          </div>
        ) : (
          <article aria-label="Field report" className="rise mx-auto max-w-[760px] overflow-hidden rounded-2xl border border-line bg-card">
            <header className="border-b border-line px-5 py-6 sm:px-8">
              <p className="label">Field report{reportDate ? ` · ${reportDate}` : ''}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <h1 className="text-[36px] leading-[1.05] tracking-[-0.02em] sm:text-[44px]">
                  {sick ? result.analysis.disease_name : 'No disease found'}
                </h1>
                {sick && (
                  <span className="inline-flex items-center gap-1.5 text-[14px] text-ink-2">
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${URGENCY_DOT[result.analysis.urgency] ?? URGENCY_DOT.Medium}`} aria-hidden />
                    {result.analysis.urgency} urgency
                  </span>
                )}
              </div>
              <p className="mt-2 text-[15px] leading-[22px] text-ink-2">
                {result.analysis.crop_type}
                {' · '}
                {sick
                  ? 'This is an AI estimate from one photo. Confirm with a local agriculture officer before spraying.'
                  : 'The leaf looks healthy in this photo. Re-scan if symptoms appear.'}
              </p>
            </header>

            {hasPlan && result.treatment && status?.voice_available && (
              <VoicePlayer analysis={result.analysis} treatment={result.treatment} language={language} />
            )}

            {hasPlan && result.treatment && status && !status.voice_available && (
              <p className="flex items-center gap-3 border-b border-line px-5 py-4 text-[14px] text-ink-2 sm:px-8">
                <VolumeX className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden />
                Audio is off for this demo. The written plan below has the same steps.
              </p>
            )}

            {hasPlan && result.treatment && (
              <>
                <section aria-label="Do this first" className="border-b border-line px-5 py-6 sm:px-8">
                  <p className="label">01 · Do this first</p>
                  <p className="mt-3 text-[19px] leading-[28px]">
                    {leadAction || 'Ask a local agriculture officer what to do for this crop.'}
                  </p>
                </section>

                <AnalysisResults analysis={result.analysis} photo={photo} />

                <div className="px-5 py-6 sm:px-8">
                  <p className="label">The plan</p>
                  <div className="mt-2">
                    <TreatmentPlan treatment={result.treatment} />
                  </div>
                </div>
              </>
            )}

            {result.status === 'disease_detected' && !hasPlan && (
              <>
                <div className="px-5 py-10 sm:px-8">
                  <div role="alert" className="border-l-2 border-[#7a5200] bg-paper p-5">
                    <p className="text-[17px] leading-[24px]">
                      {result.knowledge_match === 'none' ? 'No treatment advice for this reading' : 'Treatment plan unavailable'}
                    </p>
                    <p className="mt-2 max-w-[30rem] text-[15px] leading-[22px] text-ink-2">
                      {result.knowledge_match === 'none'
                        ? "This problem is not in AgriSense's reference notes, so no treatment advice is given. Please show the leaf to a local agriculture officer."
                        : result.treatment_message ?? 'Treatment advice is unavailable right now. Please scan again.'}
                    </p>
                  </div>
                </div>
                <AnalysisResults analysis={result.analysis} photo={photo} />
              </>
            )}

            {result.status === 'healthy' && <AnalysisResults analysis={result.analysis} photo={photo} />}

            <footer className="flex flex-col items-start justify-between gap-4 border-t border-line px-5 py-5 sm:flex-row sm:items-center sm:px-8">
              <button type="button" onClick={reset} className={primary}>Scan another leaf</button>
              <p className="label">AI-assisted guidance, not a replacement for a local agriculture officer</p>
            </footer>
          </article>
        )}
      </main>
    </div>
  );
}
