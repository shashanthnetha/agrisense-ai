'use client';

import React, { useState } from 'react';
import { Treatment } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Leaf, FlaskConical, Zap, Calendar, ShieldCheck, AlertCircle, ShoppingBag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TreatmentPlanProps {
  treatment: Treatment;
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

export function TreatmentPlan({ treatment }: TreatmentPlanProps) {
  const [activeTab, setActiveTab] = useState<'organic' | 'chemical'>('organic');

  return (
    <div className="space-y-5 w-full" aria-label="Treatment plan">

      {/* Immediate Action */}
      <Card className="w-full bg-green-50 border-green-200">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-green-800 text-base font-bold">
            <Zap className="h-4 w-4" /> Immediate Action
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-900 text-sm leading-relaxed">{treatment.immediate_action}</p>
        </CardContent>
      </Card>

      {/* Tab Toggle */}
      <div role="tablist" aria-label="Treatment type" className="w-full bg-slate-100 p-1 rounded-2xl flex">
        <button
          role="tab"
          aria-selected={activeTab === 'organic'}
          onClick={() => setActiveTab('organic')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'organic'
              ? 'bg-white shadow-sm text-green-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Leaf className="h-4 w-4" /> Organic
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'chemical'}
          onClick={() => setActiveTab('chemical')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'chemical'
              ? 'bg-white shadow-sm text-blue-700'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <FlaskConical className="h-4 w-4" /> Chemical
        </button>
      </div>

      {/* Organic Panel */}
      {activeTab === 'organic' && (
        <Card className="w-full border-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Leaf className="text-green-600 h-5 w-5" /> Organic Treatment
            </CardTitle>
            <CardDescription>Nature-friendly recovery methods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Treatment Method</h4>
              <p className="text-slate-800 text-sm leading-relaxed">{treatment.organic_treatment.method}</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-3 flex items-center gap-1">
                <ShoppingBag className="h-3 w-3" /> Required Materials
              </h4>
              <div className="flex flex-wrap gap-2">
                {treatment.organic_treatment.materials.map((m, i) => (
                  <Badge key={i} className="bg-green-50 text-green-700 border border-green-200 font-medium text-xs px-3 py-1">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Dosage</h4>
              <p className="text-slate-800 text-sm leading-relaxed">{treatment.organic_treatment.dosage}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chemical Panel */}
      {activeTab === 'chemical' && (
        <Card className="w-full border-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FlaskConical className="text-blue-600 h-5 w-5" /> Chemical Treatment
            </CardTitle>
            <CardDescription>Not shown in this demo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-slate-800 text-sm leading-relaxed" data-testid="chemical-notice">
                {treatment.chemical_notice ?? 'Chemical advice is not shown in this demo. Ask a local agriculture officer.'}
              </p>
            </div>
            <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex gap-3 items-start">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800 leading-normal">
                Always wear protective gear and follow the product label and local agricultural safety guidelines. Confirm the product and dose with a local agriculture officer.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prevention Tips */}
      <Card className="w-full border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider font-bold text-slate-500 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Prevention Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {treatment.prevention_tips.map((tip, i) => (
              <li key={i} className="flex gap-3 items-start text-sm">
                <div className="h-5 w-5 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5 text-green-600">
                  <CheckIcon />
                </div>
                <span className="leading-relaxed text-slate-700">{tip}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Recovery Timeline */}
      <Card className="w-full border-slate-100">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm uppercase tracking-wider font-bold text-slate-500 flex items-center gap-2">
            <Calendar className="h-4 w-4" /> Recovery Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center py-4">
          <p className="text-2xl font-black text-green-600 text-center">{treatment.recovery_timeline}</p>
          <p className="text-xs text-slate-500 mt-1">Expected Recovery Period</p>
        </CardContent>
      </Card>

      {/* Warning Signs */}
      {treatment.warning_signs && (
        <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex gap-3 items-start">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 leading-relaxed">
            <span className="font-bold">Warning: </span>{treatment.warning_signs}
          </p>
        </div>
      )}

    </div>
  );
}
