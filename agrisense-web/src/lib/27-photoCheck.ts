/*
 * Quick on-device look at a photo before it is sent. Advisory only: it
 * measures size, brightness and edge sharpness. It says nothing about the
 * plant and never blocks the upload.
 */
export type CheckTone = 'ok' | 'warn';
export interface PhotoCheck { label: string; note: string; tone: CheckTone }

export async function checkPhoto(src: string): Promise<PhotoCheck[]> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const w = img.naturalWidth, h = img.naturalHeight;
  const k = Math.min(1, 256 / Math.max(w, h));
  const cw = Math.max(8, Math.round(w * k)), ch = Math.max(8, Math.round(h * k));
  const c = document.createElement('canvas');
  c.width = cw; c.height = ch;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, cw, ch);
  const { data } = ctx.getImageData(0, 0, cw, ch);
  const g = new Float32Array(cw * ch);
  let sum = 0;
  for (let i = 0; i < g.length; i++) {
    g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
    sum += g[i];
  }
  const mean = sum / g.length;
  let n = 0, s = 0, s2 = 0;
  for (let y = 1; y < ch - 1; y++) for (let x = 1; x < cw - 1; x++) {
    const i = y * cw + x;
    const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - cw] - g[i + cw];
    s += l; s2 += l * l; n++;
  }
  const sharp = n ? s2 / n - (s / n) ** 2 : 0;
  const out: PhotoCheck[] = [];
  out.push(Math.min(w, h) < 500
    ? { label: 'Size', note: `${w}x${h} is small. A closer, larger photo reads better.`, tone: 'warn' }
    : { label: 'Size', note: `${w}x${h}`, tone: 'ok' });
  out.push(mean < 55
    ? { label: 'Light', note: 'Quite dark. Daylight helps.', tone: 'warn' }
    : mean > 220
      ? { label: 'Light', note: 'Very bright. Step out of direct glare.', tone: 'warn' }
      : { label: 'Light', note: 'Looks even enough', tone: 'ok' });
  out.push(sharp < 25
    ? { label: 'Focus', note: 'May be blurry. Hold steady and retake if you can.', tone: 'warn' }
    : { label: 'Focus', note: 'Looks sharp enough', tone: 'ok' });
  return out;
}
