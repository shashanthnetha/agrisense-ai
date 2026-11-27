'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
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
    <section aria-label="Listen to the report" className="rounded-xl border border-line bg-card p-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!audioSrc || isLoading}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio'}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-ink text-paper transition-[transform,background-color] duration-150 hover:bg-ink/85 active:scale-[0.97] disabled:bg-raised disabled:text-ink-3"
        >
          {isLoading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
          ) : isPlaying ? (
            <Pause className="h-4 w-4" strokeWidth={1.5} aria-hidden />
          ) : (
            <Play className="ml-0.5 h-4 w-4" strokeWidth={1.5} aria-hidden />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] leading-[20px]">Listen to the report</p>
          <p className="label">{isPlaying ? 'Playing' : isLoading ? 'Preparing audio' : 'Read aloud'}</p>
        </div>
        <label className="flex items-center gap-2">
          <span className="sr-only">Language</span>
          <select
            value={currentLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            disabled={isLoading}
            className="h-10 rounded-lg border border-line bg-paper px-3 text-[14px] text-ink"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </label>
      </div>

      {(error || unavailable) && (
        <p role="status" className="mt-3 text-[13px] leading-[20px] text-madder">
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
