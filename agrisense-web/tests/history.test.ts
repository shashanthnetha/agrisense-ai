import test from 'node:test';
import assert from 'node:assert/strict';
import { addReport, clearHistory, deleteReport, HISTORY_KEY, loadHistory, MAX_ENTRIES, toSavedReport } from '../src/lib/history.ts';

class MemStore {
  m = new Map<string, string>();
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null; }
  setItem(k: string, v: string) { this.m.set(k, v); }
  removeItem(k: string) { this.m.delete(k); }
}
const analysis = { disease_detected: true, disease_name: 'Early Blight', crop_type: 'Tomato', confidence: 90, affected_area_percent: 20, visible_symptoms: ['spots'], urgency: 'High' as const, reasoning: 'r' };
const input = (over: Record<string, unknown> = {}) => ({ status: 'disease_detected', analysis, treatment: null, language: 'English', ...over }) as Parameters<typeof toSavedReport>[0];
const mk = (n: number) => toSavedReport(input(), new Date(2026, 10, 28, 12, n), `id${n}`)!;

test('adds newest first and reads back', () => {
  const s = new MemStore();
  assert.ok(addReport(mk(1), s)); assert.ok(addReport(mk(2), s));
  assert.deepEqual(loadHistory(s).map((r) => r.id), ['id2', 'id1']);
});
test('caps at 20 and drops the oldest', () => {
  const s = new MemStore();
  for (let i = 0; i < 25; i++) addReport(mk(i), s);
  const h = loadHistory(s);
  assert.equal(h.length, MAX_ENTRIES);
  assert.equal(h[0].id, 'id24'); assert.equal(h[19].id, 'id5');
});
test('delete one and delete all', () => {
  const s = new MemStore();
  addReport(mk(1), s); addReport(mk(2), s);
  deleteReport('id1', s);
  assert.deepEqual(loadHistory(s).map((r) => r.id), ['id2']);
  clearHistory(s);
  assert.equal(s.getItem(HISTORY_KEY), null);
  assert.deepEqual(loadHistory(s), []);
});
test('corrupted storage gives an empty list and can be overwritten', () => {
  const s = new MemStore();
  s.setItem(HISTORY_KEY, '{not json'); assert.deepEqual(loadHistory(s), []);
  s.setItem(HISTORY_KEY, '{"a":1}'); assert.deepEqual(loadHistory(s), []);
  s.setItem(HISTORY_KEY, JSON.stringify([{ id: 1 }, mk(3)])); assert.equal(loadHistory(s).length, 1);
  assert.ok(addReport(mk(4), s));
});
test('storage blocked or full never throws', () => {
  assert.equal(addReport(mk(1), null), false);
  assert.deepEqual(loadHistory(null), []);
  const full = { getItem: () => null, setItem: () => { throw new Error('quota'); }, removeItem: () => { throw new Error('x'); } };
  assert.equal(addReport(mk(1), full), false); assert.equal(deleteReport('a', full), false); assert.equal(clearHistory(full), false);
});
test('not-a-plant and uncertain results are not saved', () => {
  assert.equal(toSavedReport(input({ status: 'not_a_plant' })), null);
  assert.equal(toSavedReport(input({ status: 'uncertain' })), null);
});
test('only allow-listed text fields are saved: no image, audio or unknown keys', () => {
  const dirty = input({ photo: 'blob:abc', voice_data: 'QUJD', image: 'data:image/png;base64,AAAA', analysis: { ...analysis, thumbnail: 'data:x', raw: { a: 1 } } });
  const r = toSavedReport(dirty)!;
  const json = JSON.stringify(r);
  for (const bad of ['blob:', 'voice_data', 'QUJD', 'data:image', 'thumbnail', 'photo', '"raw"']) assert.ok(!json.includes(bad), bad);
  assert.deepEqual(Object.keys(r.analysis).sort(), ['affected_area_percent', 'confidence', 'crop_type', 'disease_detected', 'disease_name', 'is_plant', 'reasoning', 'urgency', 'visible_symptoms']);
});
test('chemical treatment is never stored', () => {
  const t = { immediate_action: 'a', organic_treatment: { method: 'm', materials: [], dosage: 'd' }, chemical_treatment: { name: 'X', dose: '5ml' }, prevention_tips: [], recovery_timeline: '', warning_signs: '', source_verified: true };
  const r = toSavedReport(input({ treatment: t }))!;
  assert.equal(r.treatment!.chemical_treatment, null);
  assert.ok(!JSON.stringify(r).includes('5ml'));
});

test('unverified treatment text is never stored, and tampered storage cannot bring it back', () => {
  const t = { immediate_action: 'HIDDEN-ACTION', organic_treatment: { method: 'HIDDEN-METHOD', materials: ['m'], dosage: '1 tsp' }, chemical_treatment: null, prevention_tips: ['HIDDEN-TIP'], recovery_timeline: '7 days', warning_signs: 'HIDDEN-WARN' };
  const r = toSavedReport(input({ treatment: t }))!;
  assert.equal(r.treatment, null);
  assert.ok(!JSON.stringify(r).includes('HIDDEN'));
  const s = new MemStore();
  s.setItem(HISTORY_KEY, JSON.stringify([{ ...mk(1), treatment: t }]));
  const loaded = loadHistory(s);
  assert.equal(loaded[0].treatment, null);
  s.setItem(HISTORY_KEY, JSON.stringify([{ ...mk(1), treatment: { ...t, source_verified: 'yes' } }]));
  assert.equal(loadHistory(s)[0].treatment, null);
});
test('a verified treatment is kept (text fields only)', () => {
  const t = { immediate_action: 'a', organic_treatment: { method: 'VERIFIED-METHOD', materials: [], dosage: '' }, chemical_treatment: null, prevention_tips: [], recovery_timeline: '', warning_signs: '', source_verified: true };
  assert.equal(toSavedReport(input({ treatment: t }))!.treatment!.organic_treatment.method, 'VERIFIED-METHOD');
});
test('saving the same id twice does not duplicate', () => {
  const s = new MemStore();
  addReport(mk(1), s); addReport(mk(1), s);
  assert.equal(loadHistory(s).length, 1);
});
