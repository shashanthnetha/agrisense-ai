'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';

const ZOOMS = [2, 3, 4];

/*
 * A hand lens over the real photo. Move it with a mouse, drag it with a finger
 * (vertical swipes still scroll the page), or use the arrow keys. It only
 * magnifies. It marks nothing: AgriSense does not locate problems on a leaf.
 */
export function Loupe({ src, alt, ratio = 1920 / 1285, lens = 176 }: { src: string; alt: string; ratio?: number; lens?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [pos, setPos] = useState({ x: 0.82, y: 0.68 });
  const [zoom, setZoom] = useState(3);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const move = useCallback((e: React.PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    setPos({ x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) });
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    const s = 0.04;
    const d: Record<string, [number, number]> = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] };
    if (d[e.key]) {
      e.preventDefault();
      setPos((p) => ({ x: Math.min(1, Math.max(0, p.x + d[e.key][0])), y: Math.min(1, Math.max(0, p.y + d[e.key][1])) }));
    }
  };

  const R = lens / 2;
  const lx = pos.x * size.w;
  const ly = pos.y * size.h;
  return (
    <div>
      <div
        ref={box}
        role="group"
        aria-label="Magnifier over a sample photo of a tomato leaf. Use arrow keys to move the lens."
        tabIndex={0}
        onKeyDown={onKey}
        onPointerEnter={(e) => { if (e.pointerType === 'mouse') setActive(true); }}
        onPointerLeave={(e) => { if (e.pointerType === 'mouse') setActive(false); }}
        onPointerDown={(e) => { setActive(true); move(e); }}
        onPointerMove={(e) => { if (e.pointerType === 'mouse' || e.buttons) move(e); }}
        style={{ aspectRatio: String(ratio), touchAction: 'pan-y' }}
        className="relative w-full cursor-none select-none overflow-hidden rounded-[4px] bg-night [@media(pointer:coarse)]:cursor-auto"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} draggable={false} className="absolute inset-0 h-full w-full object-cover" />
        {size.w > 0 && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 rounded-full border-2 border-sheet shadow-[0_10px_40px_rgb(0_0_0/0.5),inset_0_0_0_1px_rgb(0_0_0/0.3)] transition-opacity duration-200"
            style={{
              width: lens,
              height: lens,
              opacity: active ? 1 : 0.92,
              transform: `translate(${lx - R}px, ${ly - R}px)`,
              backgroundImage: `url(${src})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${size.w * zoom}px ${size.h * zoom}px`,
              backgroundPosition: `${R - lx * zoom}px ${R - ly * zoom}px`,
            }}
          >
            <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sheet/90" />
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="label !text-ink-3">Sample photo. Move the lens over it. Nothing is marked.</p>
        <div role="group" aria-label="Magnification" className="flex items-center gap-1">
          {ZOOMS.map((z) => (
            <button key={z} type="button" onClick={() => setZoom(z)} aria-pressed={zoom === z} className={`h-9 min-w-11 rounded-full px-3 font-mono text-[12px] transition-colors ${zoom === z ? 'bg-ink text-sheet' : 'border border-line text-ink-2 hover:bg-raised'}`}>{z}x</button>
          ))}
        </div>
      </div>
    </div>
  );
}
