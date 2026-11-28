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

  const long = (analysis.disease_name || '').length > 22;
  const nameSize = long
    ? 'text-[32px] min-[400px]:text-[38px] sm:text-[64px] lg:text-[clamp(56px,6vw,96px)]'
    : 'text-[48px] min-[400px]:text-[58px] sm:text-[88px] lg:text-[clamp(72px,8vw,128px)]';

  return (
    <article aria-label="Field report" className="relative">
      {/* STAGE: photo pinned behind, verdict over it */}
      <div className="relative overflow-hidden bg-night max-sm:pb-0 sm:sticky sm:top-0 sm:h-[calc(100svh-4.5rem)] sm:min-h-[440px]">
        {photo && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-60 blur-3xl sm:hidden" />
            <div className="absolute inset-0 bg-gradient-to-b from-night/10 via-night/60 to-night sm:hidden" aria-hidden />
          </>
        )}
        {photo ? <PhotoLens src={photo} className="relative h-[36svh] min-h-[170px] sm:absolute sm:inset-0 sm:h-auto" /> : <div className="absolute inset-0 bg-night" />}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-[78%] bg-gradient-to-t from-night via-night/80 to-transparent sm:block" aria-hidden />
        <p className="label pointer-events-none absolute left-5 top-4 max-w-[42%] !text-bone/85 sm:max-w-none sm:left-10 sm:top-12">
          Your photo · as taken, nothing marked
        </p>
        <header className="dark-surface hero-fade pointer-events-none relative mx-auto max-w-[1320px] px-5 pb-12 pt-5 text-bone sm:absolute sm:inset-x-0 sm:bottom-0 sm:px-10 sm:pb-14 sm:pt-0">
          <p className="label rise">Field report{reportDate ? <span className="hidden sm:inline"> · {reportDate}</span> : null} · from one photo</p>
          <h1 className="display mt-2 sm:mt-3">
            <span className="rv"><span className="font-serif text-[20px] italic text-bone/80 sm:text-[26px]">{sick ? 'Looks like' : 'What we see'}</span></span>
            <span className="rv mt-1"><span style={d(120)} className={`${nameSize} block leading-[1.0]`}>
              {sick ? <em>{analysis.disease_name}.</em> : <>no disease <em>seen.</em></>}
            </span></span>
          </h1>
          <div className="rise mt-3 flex flex-wrap items-center gap-2 text-[13px] sm:mt-5" style={d(300)}>
            <span className="rounded-full border border-bone/45 px-3 py-1">{analysis.crop_type}</span>
            {sick && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-bone/45 px-3 py-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#ff9a62]" aria-hidden />
                {analysis.urgency} urgency · AI-assessed
              </span>
            )}
          </div>
          <div className="rise mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:items-center sm:gap-8" style={d(360)}>
            <p className="max-w-[34rem] text-[14.5px] leading-[21px] text-bone/90 sm:text-[16px] sm:leading-[24px]">
              {sick
                ? 'This is a tentative AI identification from one photo, not a diagnosis. Confirm with a local agriculture officer before spraying.'
                : 'The leaf looks healthy in this photo. Re-scan if symptoms appear.'}
            </p>
            {sick && (
              <a href="#what-now" className="pointer-events-auto inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-full bg-bone px-5 text-[14px] font-medium text-night">
                What to do now <span aria-hidden>↓</span>
              </a>
            )}
          </div>
        </header>
      </div>

      {/* SHEET: slides over the pinned photo */}
      <div className="relative z-10 -mt-6 min-h-[100svh] rounded-t-[26px] bg-paper shadow-[0_-18px_40px_rgb(14_23_15/0.35)]">
        <div className="mx-auto max-w-[1320px] px-5 pb-8 pt-3 sm:px-10">
          <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-ink/25" aria-hidden />

          {sick && (
            <section id="what-now" aria-label="What now" className="dark-surface scroll-rise scroll-mt-10 rounded-[6px] bg-leaf p-5 text-bone sm:p-8 lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-12">
              <div>
                <p className="label !text-[#ff9a62]">What now</p>
                {noReference ? (
                  <div role="alert" className="mt-3">
                    <p className="font-serif text-[26px] leading-[30px]">
                      {knowledgeMatch === 'none' ? 'No treatment advice for this reading' : 'Treatment plan unavailable'}
                    </p>
                    <p className="mt-2 text-[15px] leading-[23px] text-bone/80">
                      {knowledgeMatch === 'none'
                        ? "This problem is not in AgriSense's reference notes, so no treatment advice is given. Please show the leaf to a local agriculture officer."
                        : treatmentMessage ?? 'Treatment advice is unavailable right now. Please scan again.'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-3 font-serif text-[26px] leading-[32px] sm:text-[34px] sm:leading-[40px]">{method || officerLine}</p>
                )}
                <p className="mt-4 text-[13px] leading-[20px] text-bone/65">
                  No recovery forecast is given. Ask a local agriculture officer how long this problem usually takes to clear.
                </p>
                {warning && <p className="mt-5 border-l-2 border-[#ff9a62] pl-4 text-[14px] leading-[22px] text-bone/90">{warning}</p>}
              </div>
              <div className="mt-7 lg:mt-0">
                {tips.length > 0 && <TipChecklist tips={tips} />}
                {chemicalNote && (
                  <details className="group mt-3">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-[15px] font-medium">
                      About chemical products
                      <span className="label transition-transform group-open:rotate-180" aria-hidden>v</span>
                    </summary>
                    <p className="pb-2 text-[14px] leading-[22px] text-bone/75">{chemicalNote}</p>
                  </details>
                )}
              </div>
            </section>
          )}

          <section aria-label="What the model reported" className="scroll-rise mt-10 lg:grid lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-12">
            <div>
              <h2 className="display text-[30px] sm:text-[40px]">What the model <em>reported</em></h2>
              {symptoms.length > 0 ? (
                <ul className="mt-4 divide-y divide-line border-y border-line">
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
            <div className="mt-8 lg:mt-0">
              <dl className="grid grid-cols-2 gap-6 text-[13.5px] leading-[20px] lg:pt-[3.4rem]">
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
                <details className="group mt-5 border-t border-line">
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
          <p className="label mt-8 sm:hidden">AI-assisted guidance, not a replacement for a local agriculture officer</p>
        </div>
      </div>
    </article>
  );
}
