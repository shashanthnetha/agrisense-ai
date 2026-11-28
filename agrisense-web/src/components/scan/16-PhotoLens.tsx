'use client';

import React, { useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { PhotoViewer } from './PhotoViewer';

/*
 * Inspect the user's own photo: a hover loupe on pointer devices and a
 * full-size viewer (native dialog, scrollable, Esc closes) everywhere.
 * It only magnifies; it never marks or claims any region.
 */
export function PhotoLens({ src, className = '' }: { src: string; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const dlg = useRef<HTMLDialogElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [lens, setLens] = useState<{ x: number; y: number; dw: number; dh: number; ox: number; oy: number } | null>(null);
  const [open, setOpen] = useState(false);
  const ZOOM = 2.6;
  const SIZE = 168;


  const show = () => { setOpen(true); dlg.current?.showModal(); };

  const move = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse' || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const r = wrap.current!.getBoundingClientRect();
    // Map the pointer onto the photo as drawn (object-cover, 60% / 40% focus on wide screens).
    const nw = img.current?.naturalWidth || r.width, nh = img.current?.naturalHeight || r.height;
    const sc = Math.max(r.width / nw, r.height / nh);
    const dw = nw * sc, dh = nh * sc;
    setLens({ x: e.clientX - r.left, y: e.clientY - r.top, dw, dh, ox: (r.width - dw) * 0.6, oy: (r.height - dh) * 0.4 });
  };

  return (
    <div className={className}>
      <div
        ref={wrap}
        className="relative h-full w-full overflow-hidden [@media(hover:hover)_and_(pointer:fine)]:cursor-zoom-in"
        style={lens ? { cursor: 'none' } : undefined}
        onPointerMove={move}
        onPointerLeave={() => setLens(null)}
        onClick={() => show()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {/* Ambient fill for the dark area under a portrait crop: a blurred copy of the same photo, decorative only. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl min-[640px]:hidden" draggable={false} />
        <img ref={img} src={src} alt="Your leaf photo, shown as taken" className="h-full w-full object-contain object-top min-[640px]:object-cover min-[640px]:object-[60%_40%]" draggable={false} />
        {lens && (
          <span
            aria-hidden
            className="pointer-events-none absolute rounded-full border border-bone/80 shadow-[0_8px_30px_rgb(0_0_0/0.45)]"
            style={{
              width: SIZE, height: SIZE, left: lens.x - SIZE / 2, top: lens.y - SIZE / 2,
              backgroundImage: `url(${src})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: `${lens.dw * ZOOM}px ${lens.dh * ZOOM}px`,
              backgroundPosition: `${-((lens.x - lens.ox) * ZOOM - SIZE / 2)}px ${-((lens.y - lens.oy) * ZOOM - SIZE / 2)}px`,
            }}
          />
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); show(); }}
          className="absolute right-3 top-3 sm:right-10 sm:top-11 inline-flex h-11 items-center gap-2 rounded-full bg-night/80 px-4 text-[13px] text-bone backdrop-blur transition-colors hover:bg-night"
        >
          <Maximize2 className="h-4 w-4" strokeWidth={1.5} aria-hidden /> Inspect full size
        </button>
      </div>

      <dialog
        ref={dlg}
        onClose={() => setOpen(false)}
        aria-label="Your photo, full size"
        className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-night p-0 text-bone backdrop:bg-night"
        onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-5 py-3">
            <p className="label">Your photo · shown as taken · zoom and drag</p>
            <button type="button" autoFocus onClick={() => dlg.current?.close()} className="inline-flex h-11 items-center gap-2 rounded-full border border-bone/30 px-4 text-[14px]">
              <X className="h-4 w-4" aria-hidden /> Close
            </button>
          </div>
          <div className="min-h-0 flex-1">
            {open && <PhotoViewer src={src} />}
          </div>
        </div>
      </dialog>
    </div>
  );
}
