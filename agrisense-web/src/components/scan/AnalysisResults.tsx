'use client';

import React from 'react';
import { Analysis } from '@/lib/types';
import { AlertTriangle, CheckCircle2, ChevronDown } from 'lucide-react';

interface AnalysisResultsProps {
  analysis: Analysis;
}

const URGENCY_STYLE: Record<string, string> = {
  Low: 'bg-green-100 text-green-800',
  Medium: 'bg-amber-100 text-amber-900',
  High: 'bg-red-100 text-red-800',
  Critical: 'bg-red-700 text-white',
};

export function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const sick = analysis.disease_detected;
  const symptoms: string[] = analysis.visible_symptoms || [];

  return (
    <section aria-labelledby="diagnosis-heading" className="overflow-hidden rounded-3xl border bg-white shadow-sm">
      <div className={`px-5 py-5 ${sick ? 'bg-red-50' : 'bg-green-50'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            {analysis.crop_type}
          </span>
          {sick && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${URGENCY_STYLE[analysis.urgency] ?? URGENCY_STYLE.Medium}`}>
              {analysis.urgency} urgency
            </span>
          )}
        </div>
        <h2 id="diagnosis-heading" className="mt-3 flex items-start gap-2 text-2xl font-extrabold text-slate-900">
          {sick ? (
            <AlertTriangle className="mt-1 h-6 w-6 shrink-0 text-red-600" aria-hidden />
          ) : (
            <CheckCircle2 className="mt-1 h-6 w-6 shrink-0 text-green-700" aria-hidden />
          )}
          <span>{sick ? analysis.disease_name : 'No disease found'}</span>
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {sick
            ? 'This is an AI estimate from one photo. Confirm with a local agriculture officer before spraying.'
            : 'The leaf looks healthy in this photo. Re-scan if symptoms appear.'}
        </p>
      </div>

      <dl className={`grid divide-x border-y text-center ${sick ? 'grid-cols-2' : 'grid-cols-1'}`}>
        <div className="px-3 py-3">
          <dt className="text-xs text-slate-500">Model confidence</dt>
          <dd className="text-lg font-bold text-slate-900">{Math.round(analysis.confidence)}%</dd>
          <dd className="text-[11px] text-slate-400">self-reported, not verified</dd>
        </div>
        {sick && (
          <div className="px-3 py-3">
            <dt className="text-xs text-slate-500">Affected area</dt>
            <dd className="text-lg font-bold text-slate-900">{Math.round(analysis.affected_area_percent)}%</dd>
            <dd className="text-[11px] text-slate-400">of the visible leaf</dd>
          </div>
        )}
      </dl>

      {(symptoms.length > 0 || analysis.reasoning) && (
        <details className="group px-5 py-4">
          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-800">
            Why this result
            <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="mt-3 space-y-3">
            {symptoms.length > 0 && (
              <ul className="space-y-2">
                {symptoms.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-green-700" aria-hidden />
                    {s}
                  </li>
                ))}
              </ul>
            )}
            {analysis.reasoning && <p className="rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">{analysis.reasoning}</p>}
          </div>
        </details>
      )}
    </section>
  );
}
