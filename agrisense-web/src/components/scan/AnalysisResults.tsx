'use client';

import React from 'react';
import { Analysis } from '@/lib/types';

interface AnalysisResultsProps {
  analysis: Analysis;
  photo?: string | null;
}

/* The evidence strip: the photo as a small specimen thumb, with the two figures beside it.
   Progressive detail ("Why this result") stays collapsed below. */
export function AnalysisResults({ analysis, photo }: AnalysisResultsProps) {
  const sick = analysis.disease_detected;
  const symptoms: string[] = analysis.visible_symptoms || [];

  const cols = photo
    ? sick
      ? 'grid-cols-[112px_1fr_1fr] sm:grid-cols-[144px_1fr_1fr]'
      : 'grid-cols-[112px_1fr] sm:grid-cols-[144px_1fr]'
    : sick
      ? 'grid-cols-2'
      : 'grid-cols-1';

  return (
    <div>
      <dl className={`grid border-b border-line ${cols}`}>
        {photo && (
          <div className="relative aspect-square bg-raised">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="Your leaf photo" className="h-full w-full object-cover" />
            <p className="label absolute bottom-1.5 left-1.5 rounded bg-night/70 px-1.5 py-0.5 !text-[10px] !text-paper/90">Plate 01</p>
          </div>
        )}
        <div className={`p-4 sm:p-5 ${photo ? 'border-l border-line' : ''}`}>
          <dt className="label">Model confidence</dt>
          <dd className="tnum mt-1 text-[26px] leading-none sm:text-[30px]">{Math.round(analysis.confidence)}%</dd>
          <dd className="label mt-2">Self-reported, not verified</dd>
        </div>
        {sick && (
          <div className="border-l border-line p-4 sm:p-5">
            <dt className="label">Affected area</dt>
            <dd className="tnum mt-1 text-[26px] leading-none text-madder sm:text-[30px]">{Math.round(analysis.affected_area_percent)}%</dd>
            <dd className="label mt-2">Of the visible leaf</dd>
          </div>
        )}
      </dl>

      {(symptoms.length > 0 || analysis.reasoning) && (
        <details className="group border-b border-line px-5 py-3 sm:px-8">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-[15px]">
            Why this result
            <span className="label transition-transform group-open:rotate-180" aria-hidden>v</span>
          </summary>
          <div className="mt-3 space-y-4 pb-2">
            {symptoms.length > 0 && (
              <ul className="divide-y divide-line border-y border-line">
                {symptoms.map((s, i) => (
                  <li key={i} className="py-2.5 text-[14px] leading-[20px] text-ink-2">{s}</li>
                ))}
              </ul>
            )}
            {analysis.reasoning && <p className="text-[14px] leading-[22px] text-ink-2">{analysis.reasoning}</p>}
          </div>
        </details>
      )}
    </div>
  );
}
