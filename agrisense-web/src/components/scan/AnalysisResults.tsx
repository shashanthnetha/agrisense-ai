'use client';

import React from 'react';
import { Analysis } from '@/lib/types';
import { CountUp } from './CountUp';

interface AnalysisResultsProps {
  analysis: Analysis;
  photo?: string | null;
}

/* Urgency is text plus a dot, never a coloured pill. Colour only for meaning. */
const URGENCY_DOT: Record<string, string> = {
  Low: 'bg-moss',
  Medium: 'bg-[#7a5200]',
  High: 'bg-madder',
  Critical: 'bg-madder',
};

export function AnalysisResults({ analysis, photo }: AnalysisResultsProps) {
  const sick = analysis.disease_detected;
  const symptoms: string[] = analysis.visible_symptoms || [];

  return (
    <section aria-labelledby="diagnosis-heading" className="rise">
      <div className="overflow-hidden rounded-2xl border border-line bg-card">
        {photo && (
          <div className="relative aspect-[4/3] bg-raised">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="Your leaf photo" className="h-full w-full object-cover" />
          </div>
        )}
        <div className="p-5">
          <p className="label">
            {analysis.crop_type}
            {sick && (
              <>
                {' · '}
                <span className="inline-flex items-center gap-1.5 text-ink-2">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${URGENCY_DOT[analysis.urgency] ?? URGENCY_DOT.Medium}`} aria-hidden />
                  {analysis.urgency} urgency
                </span>
              </>
            )}
          </p>
          <h2 id="diagnosis-heading" className="mt-2 text-[32px] leading-[36px] tracking-[-0.02em]">
            {sick ? analysis.disease_name : 'No disease found'}
          </h2>
          <p className="mt-3 text-[14px] leading-[20px] text-ink-2">
            {sick
              ? 'This is an AI estimate from one photo. Confirm with a local agriculture officer before spraying.'
              : 'The leaf looks healthy in this photo. Re-scan if symptoms appear.'}
          </p>
        </div>

        <dl className={`grid border-t border-line ${sick ? 'grid-cols-2' : 'grid-cols-1'}`}>
          <div className="p-5">
            <dt className="label">Model confidence</dt>
            <dd className="tnum mt-1 text-[32px] leading-none"><CountUp value={Math.round(analysis.confidence)} suffix="%" /></dd>
            <dd className="label mt-2">Self-reported, not verified</dd>
          </div>
          {sick && (
            <div className="border-l border-line p-5">
              <dt className="label">Affected area</dt>
              <dd className="tnum mt-1 text-[32px] leading-none text-madder"><CountUp value={Math.round(analysis.affected_area_percent)} suffix="%" /></dd>
              <dd className="label mt-2">Of the visible leaf</dd>
            </div>
          )}
        </dl>
      </div>

      {(symptoms.length > 0 || analysis.reasoning) && (
        <details className="group mt-4 rounded-2xl border border-line bg-card px-5 py-4">
          <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-[15px]">
            Why this result
            <span className="label transition-transform group-open:rotate-180" aria-hidden>v</span>
          </summary>
          <div className="mt-3 space-y-4">
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
    </section>
  );
}
