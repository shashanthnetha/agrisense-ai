'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw, Globe } from 'lucide-react';

interface VoicePlayerProps {
  base64Audio: string | null;
  analysis?: any;
  treatment?: any;
  onLanguageChange: (lang: string) => void;
  currentLanguage: string;
}

const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu"];

export function VoicePlayer({ base64Audio, analysis, treatment, onLanguageChange, currentLanguage }: VoicePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Set initial audio from base64
  useEffect(() => {
    if (base64Audio) {
      const src = `data:audio/mp3;base64,${base64Audio}`;
      setAudioSrc(src);
    }
  }, [base64Audio]);

  // Play/pause
  const togglePlay = () => {
    if (!audioRef.current || !audioSrc) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // Regenerate voice in selected language
  const regenerateVoice = async (lang: string) => {
    if (!analysis || !treatment) return;
    setIsLoading(true);
    setIsPlaying(false);
    try {
      const res = await fetch('http://localhost:8000/api/v1/voice/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysis, treatment, language: lang })
      });
      const data = await res.json();
      if (data.voice_data) {
        setAudioSrc(`data:audio/mp3;base64,${data.voice_data}`);
      }
    } catch (e) {
      console.error('Voice regeneration failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    onLanguageChange(lang);
    await regenerateVoice(lang);
  };

  return (
    <div className="bg-slate-900 rounded-2xl p-5 text-white">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-bold text-base">Listen to Report</p>
          <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
            <span>🔊</span> ElevenLabs High Quality AI Voice
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-400" />
          <select
            value={currentLanguage}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="bg-slate-800 text-white text-sm rounded-lg px-3 py-1.5 border border-slate-700 outline-none"
          >
            {LANGUAGES.map(lang => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          disabled={!audioSrc || isLoading}
          className="h-14 w-14 rounded-full bg-green-600 hover:bg-green-500 disabled:bg-slate-700 flex items-center justify-center transition-all shrink-0"
        >
          {isLoading ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className="h-6 w-6 ml-0.5" />
          )}
        </button>

        <div className="flex-1 flex gap-1">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 rounded-full transition-all ${
                isPlaying ? 'bg-green-500 animate-pulse' : 'bg-slate-700'
              }`}
              style={{ height: `${Math.random() * 20 + 8}px` }}
            />
          ))}
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioSrc ?? undefined}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />
    </div>
  );
}
