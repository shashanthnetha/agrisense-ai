'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { History, ArrowLeft, Sprout, Search } from 'lucide-react';

export default function HistoryPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b px-4 h-16 flex items-center justify-between sticky top-0 z-10">
        <Link href="/scan" className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5 text-slate-500" />
          <span className="font-bold">Scan History</span>
        </Link>
        <Sprout className="h-6 w-6 text-primary" />
      </header>

      <main className="container max-w-2xl mx-auto px-4 py-12">
        <div className="text-center space-y-6">
          <div className="h-24 w-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <History className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Your Scan History</h1>
            <p className="text-slate-500">Track and monitor your crop health over time.</p>
          </div>

          <Card className="border-dashed border-2 bg-white/50">
            <CardContent className="py-12 flex flex-col items-center justify-center space-y-4">
              <Search className="h-12 w-12 text-slate-300" />
              <div className="space-y-1">
                <p className="font-bold text-slate-400">No scans found yet</p>
                <p className="text-sm text-slate-400">Complete your first scan to see history here.</p>
              </div>
              <Link href="/scan">
                <Button className="rounded-full h-11 px-6 shadow-lg shadow-primary/20">
                  Start First Scan
                </Button>
              </Link>
            </CardContent>
          </Card>
          
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-left">
            <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-1">
              Coming Soon
            </h4>
            <p className="text-xs text-amber-700 leading-relaxed">
              We're currently building a more advanced history tracking system that includes seasonal trends and farm-wide health reports.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
