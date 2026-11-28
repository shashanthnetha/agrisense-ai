import React from 'react';
import { Analysis, Treatment } from '@/lib/types';
import { safeList, safeText, treatmentVerified } from '@/lib/advice';
import { PhotoLens } from './PhotoLens';
import { SummaryActions, TipChecklist } from './ReportParts';

/*
 * "Plate" composition. The user's own photo is the whole first screen: the
 * same full-bleed frame that held it while it was being read. The verdict is
 * set over its lower part, with the tentative wording and the next-step
 * button. The photo stays pinned and a paper sheet slides up over it with
 * the next steps, then the evidence. Ordinary scrolling, nothing hijacked.
 * (Earlier text kept for reference:) The result is one composed spread. The user's own photo is the large
 * object (desktop: left, held in view; mobile: a cover with the verdict
 * set over it). The next step comes BEFORE the evidence so urgent guidance
 * is never below the fold or behind a tab. Nothing is drawn on the photo:
 * no localization output exists. Estimates stay small and qualified.
 */

const officerLine = 'Ask a local agriculture officer what to do for this crop, and about organic options, before spraying anything.';

interface ResultStoryProps {
  analysis: Analysis;
  treatment: Treatment | null;
  treatmentMessage?: string;
  knowledgeMatch?: 'found' | 'none';
  photo: string | null;
  reportDate: string | null;
  audio?: React.ReactNode;
}

const d = (ms: number) => ({ '--d': `${ms}ms` } as React.CSSProperties);

export function ResultStory({ analysis, treatment, treatmentMessage, knowledgeMatch, photo, reportDate, audio }: ResultStoryProps) {
  const sick = analysis.disease_detected;
  const symptoms = safeList(analysis.visible_symptoms);
  const warning = safeText(treatment?.warning_signs);
  const tips = safeList(treatment?.prevention_tips);
  const chemicalNote = safeText(treatment?.chemical_notice);
  const method = treatmentVerified(treatment) ? safeText(treatment?.organic_treatment?.method) : '';
  const noReference = sick && !treatment;

  const note = [
    'AgriSense leaf reading (AI-assisted, from one photo)',
    reportDate ? `Date: ${reportDate}` : null,
    `Crop: ${analysis.crop_type}`,
    sick ? `Tentative identification: ${analysis.disease_name}. This is not a diagnosis.` : 'No disease seen in this photo.',
    `Model confidence: ${Math.round(analysis.confidence)}% (the model's own figure, not checked against labelled leaves).`,
    sick ? `Visible area affected: about ${Math.round(analysis.affected_area_percent)}% (AI estimate, not a measurement).` : null,
    symptoms.length ? `What the model reported: ${symptoms.join('; ')}.` : null,
    'Please confirm with a local agriculture officer before spraying anything.',
  ].filter(Boolean).join('\n');

  return (
    <article aria-label="Field report">
      <section className="dark-surface bg-leaf text-bone">
      <div className="wrap pb-12 pt-8 sm:pb-16 sm:pt-12">
      <p className="label !text-lime">Field report{reportDate ? ` · ${reportDate}` : ''} · from one photo</p>

      <div className="mt-5 grid items-start gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
        <figure>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-[4px] bg-night">
            {photo ? <PhotoLens src={photo} className="h-full w-full" /> : null}
          </div>
          <figcaption className="label mt-3 !text-bone/60">Your photo, as taken. Nothing is marked.</figcaption>
        </figure>

        <div className="min-w-0">
          <p className="text-[17px] italic text-bone/75">{sick ? 'Looks like' : 'What we see'}</p>
          <h1 className="head mt-1 break-words text-[clamp(30px,4.2vw,56px)]">{sick ? analysis.disease_name : 'No disease seen'}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="rounded-full border border-bone/30 px-3 py-1">{analysis.crop_type}</span>
            {sick && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-bone/30 px-3 py-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff9a62]" aria-hidden />
                {analysis.urgency} urgency · AI-assessed
              </span>
            )}
          </div>
          <p className="mt-4 max-w-[40rem] text-[16px] leading-[24px] text-bone/80">
            {sick
              ? 'This is a tentative AI identification from one photo, not a diagnosis. Confirm with a local agriculture officer before spraying.'
              : 'The leaf looks healthy in this photo. Re-scan if symptoms appear.'}
          </p>

          {sick && (
            <section id="what-now" aria-label="What now" className="dark-surface mt-7 rounded-[6px] bg-night p-5 text-bone sm:p-7 border border-bone/15">
              <p className="label !text-[#ff9a62]">What now</p>
              {noReference ? (
                <div role="alert" className="mt-3">
                  <p className="head text-[22px] leading-[28px]">
                    {knowledgeMatch === 'none' ? 'No treatment advice for this reading' : 'Treatment plan unavailable'}
                  </p>
                  <p className="mt-2 text-[15px] leading-[23px] text-bone/80">
                    {knowledgeMatch === 'none'
                      ? "This problem is not in AgriSense's reference notes, so no treatment advice is given. Please show the leaf to a local agriculture officer."
                      : treatmentMessage ?? 'Treatment advice is unavailable right now. Please scan again.'}
                  </p>
                </div>
              ) : (
                <p className="head mt-3 text-[clamp(20px,2.2vw,26px)] leading-[1.25]">{method || officerLine}</p>
              )}
              <p className="mt-4 text-[13px] leading-[20px] text-bone/65">
                No recovery forecast is given. Ask a local agriculture officer how long this problem usually takes to clear.
              </p>
              {warning && <p className="mt-5 border-l-2 border-[#ff9a62] pl-4 text-[14px] leading-[22px] text-bone/90">{warning}</p>}
              {tips.length > 0 && <div className="mt-6"><TipChecklist tips={tips} /></div>}
              {chemicalNote && (
                <details className="group mt-3">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[15px] font-medium">
                    About chemical products
                    <span className="label transition-transform group-open:rotate-180" aria-hidden>v</span>
                  </summary>
                  <p className="pb-2 text-[14px] leading-[22px] text-bone/75">{chemicalNote}</p>
                </details>
              )}
            </section>
          )}
        </div>
      </div>
      </div>
      </section>
      <div className="wrap pb-10">
      <section aria-label="What the model reported" className="mt-10 grid gap-10 pt-2 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-14">
        <div>
          <h2 className="head page-h2">What the model reported</h2>
          {symptoms.length > 0 ? (
            <ul className="mt-5 divide-y divide-line border-y border-line">
              {symptoms.map((s, i) => (
                <li key={i} className="flex gap-4 py-3 text-[15px] leading-[22px]">
                  <span className="font-mono text-[11px] leading-[22px] text-ink-3">{String(i + 1).padStart(2, '0')}</span>{s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[15px] leading-[23px] text-ink-2">No distinct symptoms were reported for this photo.</p>
          )}
          <p className="mt-3 text-[13px] leading-[19px] text-ink-3">These are the model&apos;s words about the photo. Use &ldquo;Inspect full size&rdquo; on the photo to compare them with your leaf.</p>
        </div>
        <div>
          <dl className="grid gap-6 text-[13.5px] leading-[20px] sm:grid-cols-2">
            <div>
              <dt className="label">How sure</dt>
              <dd className="mt-1.5 text-ink-2"><span className="tnum font-medium text-ink">{Math.round(analysis.confidence)}%</span> confidence, the model&apos;s own figure, not checked against labelled leaves.</dd>
            </div>
            {sick && (
              <div>
                <dt className="label">How much of the leaf</dt>
                <dd className="mt-1.5 text-ink-2"><span className="tnum font-medium text-ink">{Math.round(analysis.affected_area_percent)}%</span> looks affected: an AI estimate of visible area, not a measurement.</dd>
              </div>
            )}
          </dl>
          {analysis.reasoning && (
            <details className="group mt-6 border-t border-line">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-[14px] font-medium">
                Why the model read it this way
                <span className="label transition-transform group-open:rotate-180" aria-hidden>v</span>
              </summary>
              <p className="pb-2 text-[14px] leading-[22px] text-ink-2">{analysis.reasoning}</p>
            </details>
          )}
          <div className="mt-5"><SummaryActions text={note} /></div>
          {audio && <div className="mt-4 border-t border-line pt-4">{audio}</div>}
        </div>
      </section>
    </div>
    </article>
  );
}
