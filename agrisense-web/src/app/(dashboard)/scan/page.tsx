'use client';

import React, { useState, useEffect } from 'react';
import { ImageUploader } from '@/components/scan/ImageUploader';
import { AnalysisResults } from '@/components/scan/AnalysisResults';
import { TreatmentPlan } from '@/components/scan/TreatmentPlan';
import { VoicePlayer } from '@/components/scan/VoicePlayer';
import { Stepper } from '@/components/scan/Stepper';
import { analyzeCrop, ACCESS_KEY_STORAGE } from '@/lib/api';
import { ScanResponse } from '@/lib/types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Sprout, History, RefreshCcw, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ScanPage() {
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState("English");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [accessKey, setAccessKey] = useState<string>('');

  useEffect(() => {
    setAccessKey(window.localStorage.getItem(ACCESS_KEY_STORAGE) || '');
  }, []);

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
      if (
        !data ||
        !["healthy", "disease_detected", "not_a_plant", "uncertain"].includes(data.status)
      ) {
        throw new Error("Unexpected response from server");
      }
      if (data.status === "not_a_plant" || data.status === "uncertain") {
        setNotice(
          data.message ||
            "We could not give a reliable result for this photo. Please try a clearer photo."
        );
        return;
      }
      setResult(data);
      toast.success("Analysis complete!");
    } catch (err: unknown) {
      console.error(err);
      const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
      setError(
        (typeof detail === 'string' && detail) ||
          "We could not analyze this image. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError(null);
    setNotice(null);
  };

  const step: 0 | 1 | 2 = result ? 2 : isLoading ? 1 : 0;

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="AgriSense AI home">
          <Sprout className="h-6 w-6 text-primary" aria-hidden />
          <span className="hidden text-lg font-bold sm:block">AgriSense AI</span>
        </Link>
        <Link href="/history">
          <Button variant="ghost" size="sm" className="h-10 gap-2">
            <History className="h-4 w-4" aria-hidden /> History
          </Button>
        </Link>
      </header>

      <main className="container mx-auto max-w-2xl space-y-6 px-4 py-6 sm:py-8">
        <Stepper current={step} />

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="space-y-6"
            >
              <div className="space-y-1 text-center">
                <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Scan your crop</h1>
                <p className="text-sm text-slate-500">Get an AI-assisted check of a leaf from one photo.</p>
              </div>

              <div className="space-y-1">
                <label htmlFor="access-key" className="text-xs font-medium text-slate-600">
                  Access key (needed to scan during the demo)
                </label>
                <input
                  id="access-key"
                  type="password"
                  autoComplete="off"
                  value={accessKey}
                  onChange={(e) => saveAccessKey(e.target.value)}
                  className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
                />
              </div>

              <ImageUploader onUpload={handleUpload} isLoading={isLoading} />

              {notice && (
                <div role="status" className="space-y-1 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">No reliable result</p>
                  <p>{notice}</p>
                </div>
              )}

              {error && (
                <div role="alert" className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                  <p className="font-semibold">Analysis failed</p>
                  <p>{error}</p>
                  {lastFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleUpload(lastFile)}
                      className="h-10 gap-2 border-red-300 text-red-800 hover:bg-red-100"
                    >
                      <RefreshCcw className="h-3 w-3" aria-hidden /> Try again
                    </Button>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <h2 className="mb-3 text-sm font-bold text-slate-800">For a clearer result</h2>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>Use daylight and avoid shadows.</li>
                  <li>Frame one leaf that shows the symptoms.</li>
                  <li>Hold the camera 10 to 15 cm away and keep it steady.</li>
                  <li>Skip blurry or very dark photos.</li>
                </ul>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <AnalysisResults analysis={result.analysis} />

              {result.status === 'disease_detected' && result.treatment && (
                <VoicePlayer
                  base64Audio={result.voice_data}
                  analysis={result.analysis}
                  treatment={result.treatment}
                  onLanguageChange={setLanguage}
                  currentLanguage={language}
                />
              )}

              {result.treatment && <TreatmentPlan treatment={result.treatment} />}

              {result.status === 'disease_detected' && !result.treatment && (
                <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-bold">Treatment plan unavailable</p>
                  <p className="mt-1">
                    {result.treatment_message ?? 'Treatment advice is unavailable right now. Please scan again.'}
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {result && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t bg-white/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl gap-3">
            <Button onClick={reset} className="h-12 flex-1 gap-2 rounded-xl">
              <ScanLine className="h-5 w-5" aria-hidden /> Scan another leaf
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
