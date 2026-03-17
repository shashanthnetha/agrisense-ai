'use client';

import React from 'react';
import { Analysis } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface AnalysisResultsProps {
  analysis: Analysis;
}

export function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const urgencyColors = {
    Low: 'bg-green-100 text-green-800 border-green-200',
    Medium: 'bg-orange-100 text-orange-800 border-orange-200',
    High: 'bg-red-100 text-red-800 border-red-200',
    Critical: 'bg-red-200 text-red-900 border-red-300 animate-pulse',
  };

  const UrgencyIcon = {
    Low: CheckCircle2,
    Medium: Info,
    High: AlertTriangle,
    Critical: AlertCircle,
  }[analysis.urgency] || AlertTriangle;

  return (
    <Card className="w-full border-green-100 overflow-hidden">
      <div className={`h-2 w-full ${analysis.disease_detected ? 'bg-red-500' : 'bg-green-500'}`} />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="outline" className="text-xs uppercase tracking-wider font-semibold">
            {analysis.crop_type}
          </Badge>
          <Badge className={`${urgencyColors[analysis.urgency]} flex items-center gap-1`}>
            <UrgencyIcon className="h-3 w-3" />
            {analysis.urgency} Urgency
          </Badge>
        </div>
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          {analysis.disease_detected ? (
            <>
              <AlertTriangle className="text-red-500 h-6 w-6" />
              {analysis.disease_name}
            </>
          ) : (
            <>
              <CheckCircle2 className="text-green-500 h-6 w-6" />
              Healthy Crop
            </>
          )}
        </CardTitle>
        <CardDescription className="text-base">
          Confidence: {analysis.confidence}% Accuracy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 pt-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span>Affected Area</span>
            <span>{analysis.affected_area_percent}%</span>
          </div>
          <Progress value={analysis.affected_area_percent} className="h-2 bg-slate-100" />
        </div>

        <div className="space-y-3">
          <h4 className="font-bold text-sm uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <Info className="h-4 w-4" /> Visible Symptoms
          </h4>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {((analysis as any).visible_symptoms || (analysis as any).symptoms || []).map((symptom: string, idx: number) => (
              <li key={idx} className="flex items-center gap-2 text-sm bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                {symptom}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
          <h4 className="font-bold text-sm uppercase tracking-wider text-green-700 mb-2">Expert Reasoning</h4>
          <p className="text-sm text-green-800 leading-relaxed italic">
            "{analysis.reasoning}"
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
