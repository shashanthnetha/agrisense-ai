'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { generateVoice } from '@/lib/api';
import { Analysis, Treatment } from '@/lib/types';

interface VoicePlayerProps {
  base64Audio: string | null;
  analysis?: Analysis;
  treatment?: Treatment | null;
  onLanguageChange: (lang: string) => void;
  currentLanguage: string;
}

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu'];
// Fixed bar heights: no randomness, so the player does not jump on re-render.
const BARS = [10, 18, 12, 24, 16, 28, 14, 22, 10, 26, 18, 12, 24, 16, 28, 20, 12, 22, 14, 26];

export function VoicePlayer({ base64Audio, analysis, treatment, onLanguageChange, currentLanguage }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setAudioSrc(base64Audio ? `data:audio/mp3;base64,${base64Audio}` : null);
  }, [base64Audio]);

  const togglePlay = async () => {
    const el = audioRef.current;
    if (!el || !audioSrc) return;
    if (isPlaying) {
      el.pause();
      return;
    }
    try {
      await el.play();
    } catch {
      setError('Could not play the audio on this device.');
    }
  };

  const handleLanguageChange = async (lang: string) => {
    onLanguageChange(lang);
    if (!analysis || !treatment) return;
    setIsLoading(true);
    setError(null);
    audioRef.current?.pause();
    try {
      const data = await generateVoice(analysis, treatment, lang);
      if (data) {
        setAudioSrc(`data:audio/mp3;base64,${data}`);
      } else {
        setAudioSrc(null);
        setError(`Voice in ${lang} is unavailable right now.`);
      }
    } catch {
      setAudioSrc(null);
      setError(`Voice in ${lang} is unavailable right now.`);
    } finally {
      setIsLoading(false);
    }
  };

  const unavailable = !audioSrc && !isLoading;

  return (
    <section aria-label="Listen to the report" className="rounded-3xl bg-slate-900 p-4 text-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-green-400" aria-hidden />
          <p className="text-sm font-semibold">Listen to the report</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-slate-300">
          <span className="sr-only sm:not-sr-only">Language</span>
          <select
            value={currentLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={isLoading}
            className="h-10 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm text-white"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!audioSrc || isLoading}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700"
        >
          {isLoading ? (
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" aria-hidden />
          ) : (
            <Play className="ml-0.5 h-5 w-5" aria-hidden />
          )}
        </button>
        <div className="flex h-8 flex-1 items-center gap-1" aria-hidden>
          {BARS.map((h, i) => (
            <div key={i} className={`flex-1 rounded-full ${isPlaying ? 'bg-green-500' : 'bg-slate-600'}`} style={{ height: h }} />
          ))}
        </div>
      </div>

      {(error || unavailable) && (
        <p role="status" className="mt-3 text-xs text-amber-300">
          {error ?? 'Audio is not available for this report.'}
        </p>
      )}

      <audio
        ref={audioRef}
        src={audioSrc ?? undefined}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
    </section>
  );
}
