'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause } from 'lucide-react';
import { generateVoice } from '@/lib/api';
import { Analysis, Treatment } from '@/lib/types';

interface VoicePlayerProps {
  analysis?: Analysis;
  treatment?: Treatment | null;
  onLanguageChange: (lang: string) => void;
  currentLanguage: string;
}

const LANGUAGES = ['English', 'Hindi', 'Tamil', 'Telugu'];

export function VoicePlayer({ analysis, treatment, onLanguageChange, currentLanguage }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Audio is made only when someone taps Listen. Clips are kept by language, so listening again
  // never asks the server a second time.
  const [clips, setClips] = useState<Record<string, string>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const busy = useRef(false); // blocks a second request while one is running
  const autoplay = useRef(false);
  const audioSrc = clips[currentLanguage] ?? null;

  useEffect(() => {
    if (autoplay.current && audioSrc && audioRef.current) {
      autoplay.current = false;
      audioRef.current.play().catch(() => {}); // if the browser blocks it, tapping Listen plays it
    }
  }, [audioSrc]);

  const handleLanguageChange = (lang: string) => {
    audioRef.current?.pause();
    setError(null);
    onLanguageChange(lang);
  };

  const listen = async () => {
    const el = audioRef.current;
    if (isPlaying) {
      el?.pause();
      return;
    }
    if (audioSrc) {
      try {
        await el?.play();
      } catch {
        setError('Could not play the audio on this device.');
      }
      return;
    }
    if (busy.current || !analysis || !treatment) return;
    busy.current = true;
    setIsLoading(true);
    setError(null);
    const lang = currentLanguage;
    try {
      const data = await generateVoice(analysis, treatment, lang);
      if (data) {
        autoplay.current = true;
        setClips((c) => ({ ...c, [lang]: `data:audio/mp3;base64,${data}` }));
      } else {
        setError(`Audio in ${lang} is unavailable right now.`);
      }
    } catch (e) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      setError(
        status === 503
          ? 'Audio is not available right now.'
          : status === 429
            ? 'The audio limit has been reached for now.'
            : `Audio in ${lang} is unavailable right now.`,
      );
    } finally {
      busy.current = false;
      setIsLoading(false);
    }
  };

  return (
    <section aria-label="Listen to the report" className="rounded-xl border border-line bg-card p-3">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={listen}
          disabled={isLoading}
          aria-label={isPlaying ? 'Pause audio' : 'Listen to the report'}
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
          <p className="label">{isPlaying ? 'Playing' : isLoading ? 'Preparing audio' : audioSrc ? 'Ready' : 'Tap to hear it read aloud'}</p>
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

      {error && (
        <p role="status" className="mt-3 text-[13px] leading-[20px] text-madder">
          {error}
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
