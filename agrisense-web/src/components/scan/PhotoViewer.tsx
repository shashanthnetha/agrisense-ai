'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, Maximize } from 'lucide-react';

/*
 * Full-size viewer for the user's own photo. Zoom with the buttons, + / -,
 * the wheel, a double tap or a pinch; drag or use the arrow keys to move.
 * It only magnifies the photo as taken. Nothing is marked.
 */
const MAX = 6;
type T = { s: number; x: number; y: number };

export function PhotoViewer({ src }: { src: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [t, setT] = useState<T>({ s: 1, x: 0, y: 0 });
  const [fit, setFit] = useState(1);
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ d: number; s: number } | null>(null);
  const last = useRef<number>(0);

  const clamp = useCallback((n: T, f = fit): T => {
    const el = box.current;
    if (!el || !nat) return n;
    const s = Math.min(MAX, Math.max(f, n.s));
    const iw = nat.w * s, ih = nat.h * s;
    const cx = el.clientWidth, cy = el.clientHeight;
    const x = iw <= cx ? (cx - iw) / 2 : Math.min(0, Math.max(cx - iw, n.x));
    const y = ih <= cy ? (cy - ih) / 2 : Math.min(0, Math.max(cy - ih, n.y));
    return { s, x, y };
  }, [nat, fit]);

  const reset = useCallback(() => {
    const el = box.current;
    if (!el || !nat) return;
    const f = Math.min(el.clientWidth / nat.w, el.clientHeight / nat.h);
    setFit(f);
    setT(clamp({ s: f, x: 0, y: 0 }, f));
  }, [nat, clamp]);

  useEffect(() => {
    reset();
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(reset);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nat]);

  const zoomAt = (factor: number, px?: number, py?: number) => {
    const el = box.current;
    if (!el) return;
    const cx = px ?? el.clientWidth / 2, cy = py ?? el.clientHeight / 2;
    setT((p) => {
      const s = Math.min(MAX, Math.max(fit, p.s * factor));
      const k = s / p.s;
      return clamp({ s, x: cx - (cx - p.x) * k, y: cy - (cy - p.y) * k });
    });
  };
  const rel = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  // wheel needs a non-passive listener to stop the page behind from scrolling
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const h = (e: WheelEvent) => {
      e.preventDefault();
      const p = rel(e);
      zoomAt(Math.exp(-e.deltaY * 0.0015), p.x, p.y);
    };
    el.addEventListener('wheel', h, { passive: false });
    return () => el.removeEventListener('wheel', h);
  });

  const down = (e: React.PointerEvent) => {
    box.current?.setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, rel(e));
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      gesture.current = { d: Math.hypot(a.x - b.x, a.y - b.y), s: t.s };
    }
    const now = Date.now();
    if (pts.current.size === 1 && now - last.current < 300) {
      const p = rel(e);
      if (t.s > fit * 1.05) reset(); else zoomAt(2.5, p.x, p.y);
    }
    last.current = now;
  };
  const move = (e: React.PointerEvent) => {
    const prev = pts.current.get(e.pointerId);
    if (!prev) return;
    const cur = rel(e);
    pts.current.set(e.pointerId, cur);
    if (pts.current.size === 2 && gesture.current) {
      const [a, b] = [...pts.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const target = gesture.current.s * (d / gesture.current.d);
      setT((p) => {
        const s = Math.min(MAX, Math.max(fit, target));
        const k = s / p.s;
        return clamp({ s, x: mx - (mx - p.x) * k, y: my - (my - p.y) * k });
      });
    } else if (pts.current.size === 1) {
      setT((p) => clamp({ ...p, x: p.x + cur.x - prev.x, y: p.y + cur.y - prev.y }));
    }
  };
  const up = (e: React.PointerEvent) => {
    pts.current.delete(e.pointerId);
    if (pts.current.size < 2) gesture.current = null;
  };
  const key = (e: React.KeyboardEvent) => {
    const step = 60;
    if (e.key === '+' || e.key === '=') zoomAt(1.4);
    else if (e.key === '-') zoomAt(1 / 1.4);
    else if (e.key === '0') reset();
    else if (e.key === 'ArrowLeft') setT((p) => clamp({ ...p, x: p.x + step }));
    else if (e.key === 'ArrowRight') setT((p) => clamp({ ...p, x: p.x - step }));
    else if (e.key === 'ArrowUp') setT((p) => clamp({ ...p, y: p.y + step }));
    else if (e.key === 'ArrowDown') setT((p) => clamp({ ...p, y: p.y - step }));
    else return;
    e.preventDefault();
  };

  const pct = Math.round((t.s / fit) * 100);
  const btn = 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-bone/30 text-bone transition-colors hover:bg-bone/10 disabled:opacity-35';
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        ref={box}
        tabIndex={0}
        role="img"
        aria-label="Your leaf photo at full size. Use plus and minus to zoom, arrow keys to move, zero to fit."
        className="relative min-h-0 flex-1 touch-none select-none overflow-hidden bg-night outline-offset-[-3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-lime"
        style={{ cursor: t.s > fit * 1.02 ? 'grab' : 'zoom-in' }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={key}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
          className="absolute left-0 top-0 max-w-none origin-top-left will-change-transform"
          style={nat ? { width: nat.w, height: nat.h, transform: `translate(${t.x}px, ${t.y}px) scale(${t.s})` } : { opacity: 0 }}
        />
      </div>
      <div className="flex items-center justify-center gap-3 border-t border-bone/15 px-5 py-3">
        <button type="button" className={btn} onClick={() => zoomAt(1 / 1.5)} disabled={t.s <= fit * 1.001} aria-label="Zoom out"><Minus className="h-4 w-4" aria-hidden /></button>
        <span className="tnum w-14 text-center font-mono text-[13px] text-bone/80" aria-live="polite">{pct}%</span>
        <button type="button" className={btn} onClick={() => zoomAt(1.5)} disabled={t.s >= MAX * 0.999} aria-label="Zoom in"><Plus className="h-4 w-4" aria-hidden /></button>
        <button type="button" className={`${btn} ml-2 !w-auto gap-2 px-4 text-[13px]`} onClick={reset} disabled={t.s <= fit * 1.001}><Maximize className="h-4 w-4" aria-hidden /> Fit</button>
      </div>
    </div>
  );
}
