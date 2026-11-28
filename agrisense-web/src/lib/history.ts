/*
 * On-device scan history. Text only: no photo, no thumbnail, no audio. Each entry is built from an
 * explicit allow-list of fields, so nothing else a server sends can be saved by accident.
 * Kept in this browser's localStorage only: clearing site data or using another browser or device loses it.
 */
import type { Analysis, Treatment } from './types';

export const HISTORY_KEY = 'agrisense_history_v1';
export const MAX_ENTRIES = 20;

export interface SavedReport {
  id: string;
  savedAt: string; // ISO time
  language: string;
  status: 'healthy' | 'disease_detected';
  analysis: Analysis;
  treatment: Treatment | null;
  treatmentMessage?: string;
  knowledgeMatch?: 'found' | 'none';
}

export interface ReportInput {
  status: string;
  analysis: Analysis;
  treatment: Treatment | null;
  treatmentMessage?: string;
  knowledgeMatch?: 'found' | 'none';
  language: string;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const str = (v: unknown, max = 600): string => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const strList = (v: unknown, max = 12): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, max).map((x) => x.slice(0, 400)) : [];

function cleanAnalysis(a: Partial<Analysis> | undefined): Analysis | null {
  if (!a || typeof a !== 'object') return null;
  const urgency = ['Low', 'Medium', 'High', 'Critical'].includes(a.urgency as string) ? (a.urgency as Analysis['urgency']) : 'Low';
  return {
    is_plant: true,
    disease_detected: a.disease_detected === true,
    disease_name: str(a.disease_name, 120),
    crop_type: str(a.crop_type, 120),
    confidence: num(a.confidence),
    affected_area_percent: num(a.affected_area_percent),
    visible_symptoms: strList(a.visible_symptoms),
    urgency,
    reasoning: str(a.reasoning, 1500),
  };
}

function cleanTreatment(t: Partial<Treatment> | null | undefined): Treatment | null {
  if (!t || typeof t !== 'object') return null;
  const o = (t.organic_treatment ?? {}) as Partial<Treatment['organic_treatment']>;
  return {
    immediate_action: str(t.immediate_action, 1500),
    organic_treatment: { method: str(o.method, 2000), materials: strList(o.materials), dosage: str(o.dosage, 300) },
    chemical_treatment: null,
    chemical_notice: str(t.chemical_notice, 600),
    prevention_tips: strList(t.prevention_tips),
    recovery_timeline: str(t.recovery_timeline, 300),
    warning_signs: str(t.warning_signs, 800),
    source_verified: t.source_verified === true,
  };
}

/** Builds the saved form of a result, or null when the result is not worth saving (not a plant / uncertain). */
export function toSavedReport(input: ReportInput, now: Date = new Date(), id?: string): SavedReport | null {
  if (input.status !== 'healthy' && input.status !== 'disease_detected') return null;
  const analysis = cleanAnalysis(input.analysis);
  if (!analysis) return null;
  return {
    id: id ?? `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    savedAt: now.toISOString(),
    language: str(input.language, 30) || 'English',
    status: input.status,
    analysis,
    treatment: cleanTreatment(input.treatment),
    treatmentMessage: input.treatmentMessage ? str(input.treatmentMessage, 600) : undefined,
    knowledgeMatch: input.knowledgeMatch === 'found' || input.knowledgeMatch === 'none' ? input.knowledgeMatch : undefined,
  };
}

function valid(e: unknown): e is SavedReport {
  const r = e as SavedReport;
  return (
    !!r && typeof r === 'object' && typeof r.id === 'string' && typeof r.savedAt === 'string' &&
    (r.status === 'healthy' || r.status === 'disease_detected') && !!r.analysis && typeof r.analysis === 'object'
  );
}

/** Newest first. Corrupted or unreadable storage yields an empty list instead of an error. */
export function loadHistory(store?: Store | null): SavedReport[] {
  if (!store) return [];
  try {
    const raw = store.getItem(HISTORY_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(valid).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

/** Saves a report (newest first, oldest dropped past MAX_ENTRIES). Returns false when storage refuses it. */
export function addReport(report: SavedReport, store?: Store | null): boolean {
  if (!store) return false;
  try {
    const next = [report, ...loadHistory(store).filter((r) => r.id !== report.id)].slice(0, MAX_ENTRIES);
    store.setItem(HISTORY_KEY, JSON.stringify(next));
    return true;
  } catch {
    return false;
  }
}

export function deleteReport(id: string, store?: Store | null): boolean {
  if (!store) return false;
  try {
    store.setItem(HISTORY_KEY, JSON.stringify(loadHistory(store).filter((r) => r.id !== id)));
    return true;
  } catch {
    return false;
  }
}

export function clearHistory(store?: Store | null): boolean {
  if (!store) return false;
  try {
    store.removeItem(HISTORY_KEY);
    return true;
  } catch {
    return false;
  }
}

/** The browser's storage, or null when it is blocked (private mode, disabled cookies). */
export function browserStore(): Store | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = window.localStorage;
    const probe = '__agrisense_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}
