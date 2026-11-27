'use client';

import React, { useState, useEffect } from 'react';
import { ImageUploader } from '@/components/scan/ImageUploader';
import { AnalysisResults } from '@/components/scan/AnalysisResults';
import { TreatmentPlan } from '@/components/scan/TreatmentPlan';
import { VoicePlayer } from '@/components/scan/VoicePlayer';
import { Wordmark } from '@/components/site/Wordmark';
import { analyzeCrop, ACCESS_KEY_STORAGE } from '@/lib/api';
import { ScanResponse } from '@/lib/types';
import { toast } from 'sonner';
import Link from 'next/link';

const TIPS = [
  'Use daylight and avoid shadows',
  'Frame one leaf that shows the symptoms',
  'Hold the camera 10 to 15 cm away and keep it steady',
  'Skip blurry or very dark photos',
];

const primary = 'inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-ink px-6 text-[15px] font-medium text-paper transition-[transform,background-color] duration-150 hover:bg-ink/85 active:scale-[0.98] disabled:opacity-50';

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

  useEffect(() => {
    setAccessKey(window.localStorage.getItem(ACCESS_KEY_STORAGE) || '');
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
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError((typeof detail === 'string' && detail) || 'We could not analyze this image. Please try again.');
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
              <ImageUploader onUpload={handleUpload} isLoading={isLoading} />

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
                  {lastFile && (
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

              <div className="mt-10">
                <label htmlFor="access-key" className="label block">Access key (needed to scan during the demo)</label>
                <input
                  id="access-key"
                  type="password"
                  autoComplete="off"
                  value={accessKey}
                  onChange={(e) => saveAccessKey(e.target.value)}
                  className="mt-2 h-10 w-full rounded-lg border border-line bg-card px-3 text-[14px] text-ink"
                />
              </div>
            </aside>
          </div>
        ) : (
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div className="lg:sticky lg:top-8 lg:self-start">
              <AnalysisResults analysis={result.analysis} photo={photo} />
              <button type="button" onClick={reset} className={`${primary} mt-6 w-full`}>Scan another leaf</button>
            </div>

            <div className="space-y-8">
              {result.status === 'disease_detected' && hasPlan && result.treatment && (
                <VoicePlayer
                  base64Audio={result.voice_data}
                  analysis={result.analysis}
                  treatment={result.treatment}
                  onLanguageChange={setLanguage}
                  currentLanguage={language}
                />
              )}

              {hasPlan && result.treatment && <TreatmentPlan treatment={result.treatment} />}

              {result.status === 'disease_detected' && !hasPlan && (
                <div role="alert" className="border-l-2 border-[#7a5200] bg-card p-4">
                  <p className="text-[15px]">
                    {result.knowledge_match === 'none' ? 'No treatment advice for this reading' : 'Treatment plan unavailable'}
                  </p>
                  <p className="mt-1 text-[14px] leading-[20px] text-ink-2">
                    {result.knowledge_match === 'none'
                      ? "This problem is not in AgriSense's reference notes, so no treatment advice is given. Please show the leaf to a local agriculture officer."
                      : result.treatment_message ?? 'Treatment advice is unavailable right now. Please scan again.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
