'use client';

import React, { useEffect, useState } from 'react';

/* Tweens a figure once, in 600 ms. Reduced motion shows the final number at once. */
export function CountUp({ value, suffix = '' }: { value: number; suffix?: string }) {
  const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 600);
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return (
    <>
      <span aria-hidden>{shown}{suffix}</span>
      <span className="sr-only">{value}{suffix}</span>
    </>
  );
}
