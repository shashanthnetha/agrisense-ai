'use client';

import React from 'react';
import { Treatment } from '@/lib/types';
import { safeText, safeList } from '@/lib/advice';

interface TreatmentPlanProps {
  treatment: Treatment;
}

function Entry({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  const i = Number(n) - 1;
  return (
    <section style={{ animationDelay: `${i * 70}ms` }} className="rise grid grid-cols-[40px_1fr] gap-x-4 border-t border-line py-6 first:border-t-0 first:pt-0 sm:grid-cols-[56px_1fr]">
      <span className="label tnum pt-2">{n}</span>
      <div>
        <h3 className="text-[24px] leading-[28px] tracking-[-0.01em]">{title}</h3>
        <div className="mt-3">{children}</div>
      </div>
    </section>
  );
}

export function TreatmentPlan({ treatment }: TreatmentPlanProps) {
  const org = treatment.organic_treatment;
  const action = safeText(treatment.immediate_action) || 'Ask a local agriculture officer what to do for this crop.';
  const method = safeText(org.method) || 'Ask a local agriculture officer about organic options for this crop.';
  const materials = safeList(org.materials);
  const tips = safeList(treatment.prevention_tips);
  const warning = safeText(treatment.warning_signs);
  return (
    <div aria-label="Treatment plan" className="rise rise-2">
      <Entry n="01" title="Do this first">
        <p className="text-[17px] leading-[26px]">{action}</p>
      </Entry>

      <Entry n="02" title="Organic treatment">
        <p className="text-[15px] leading-[24px] text-ink-2">{method}</p>
        {materials.length > 0 && (
          <div className="mt-4">
            <p className="label">Materials</p>
            <ul className="mt-2 divide-y divide-line border-y border-line">
              {materials.map((m, i) => (
                <li key={i} className="py-2 text-[14px] leading-[20px]">{m}</li>
              ))}
            </ul>
          </div>
        )}
        {org.dosage && (
          <div className="mt-4">
            <p className="label">How much</p>
            <p className="mt-1 text-[15px] leading-[24px] text-ink-2">{org.dosage}</p>
          </div>
        )}
      </Entry>

      {tips.length > 0 && (
      <Entry n="03" title="Prevention">
        <ul className="divide-y divide-line border-y border-line">
          {tips.map((tip, i) => (
            <li key={i} className="py-3 text-[15px] leading-[22px] text-ink-2">{tip}</li>
          ))}
        </ul>
      </Entry>
      )}

      <Entry n="04" title="Recovery">
        <p className="text-[15px] leading-[24px] text-ink-2">No recovery forecast is given. Ask a local agriculture officer how long this problem usually takes to clear.</p>
      </Entry>

      {warning && (
        <Entry n="05" title="Watch for">
          <p className="border-l-2 border-madder pl-4 text-[15px] leading-[24px]">{warning}</p>
        </Entry>
      )}

      <details className="group border-t border-line pt-4">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between text-[15px]">
          Chemical products
          <span className="label transition-transform group-open:rotate-180" aria-hidden>v</span>
        </summary>
        <p className="mt-2 text-[14px] leading-[22px] text-ink-2" data-testid="chemical-notice">
          {treatment.chemical_notice ?? 'Chemical advice is not shown in this demo. Ask a local agriculture officer.'}
        </p>
        <p className="label mt-3">
          Wear protective gear and follow the product label and local safety guidance. Confirm any product and dose with a local agriculture officer.
        </p>
      </details>
    </div>
  );
}
