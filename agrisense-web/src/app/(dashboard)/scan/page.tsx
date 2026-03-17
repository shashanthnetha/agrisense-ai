'use client';

import React, { useState } from 'react';
import { ImageUploader } from '@/components/scan/ImageUploader';
import { AnalysisResults } from '@/components/scan/AnalysisResults';
import { TreatmentPlan } from '@/components/scan/TreatmentPlan';
import { VoicePlayer } from '@/components/scan/VoicePlayer';
import { analyzeCrop } from '@/lib/api';
import { ScanResponse } from '@/lib/types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Sprout, History, ArrowLeft, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ScanPage() {
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState("English");

  const handleUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const data = await analyzeCrop(file, language);
      setResult(data);
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.detail || "Failed to analyze image. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Sprout className="h-6 w-6 text-primary" />
          <span className="font-bold text-lg hidden sm:block">AgriSense AI</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/history">
            <Button variant="ghost" size="sm" className="gap-2">
              <History className="h-4 w-4" /> History
            </Button>
          </Link>
        </div>
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-2">
                <h1 className="text-3xl font-black text-slate-900">Scan Your Crop</h1>
                <p className="text-slate-500">Upload a clear photo of the infected area</p>
              </div>

              <ImageUploader onUpload={handleUpload} isLoading={isLoading} />
              
              <div className="bg-white p-6 rounded-2xl border border-slate-100 space-y-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  Quick Tips for Better Results
                </h3>
                <ul className="grid grid-cols-1 gap-3 text-sm text-slate-600">
                  <li className="flex gap-2">✅ Ensure good lighting (daylight is best)</li>
                  <li className="flex gap-2">✅ Focus on a single leaf with symptoms</li>
                  <li className="flex gap-2">✅ Hold the camera 10-15cm away</li>
                  <li className="flex gap-2">✅ Avoid blurry or very dark photos</li>
                </ul>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={reset} className="gap-2 -ml-2">
                  <ArrowLeft className="h-4 w-4" /> New Scan
                </Button>
                <Button variant="outline" size="sm" onClick={reset} className="gap-2 rounded-full border-primary text-primary hover:bg-primary/5">
                  <RefreshCcw className="h-3 w-3" /> Rescan
                </Button>
              </div>

              <VoicePlayer 
                base64Audio={result.voice_data} 
                analysis={result.analysis} 
                treatment={result.treatment}
                onLanguageChange={setLanguage} 
                currentLanguage={language} 
              />

              <AnalysisResults analysis={result.analysis} />

              {result.treatment && (
                <TreatmentPlan treatment={result.treatment} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
