import React from 'react';
/*
 * Illustration, not a real scan. A leaf drawn as a specimen plate with the
 * callouts a report gives. Colour lives here and only here.
 */
const dl = (ms: number) => ({ '--d': `${ms}ms` }) as React.CSSProperties;

export function LeafPlate({ className = '' }: { className?: string }) {
  return (
    <figure className={className}>
      <svg viewBox="0 0 600 600" role="img" aria-label="Illustration of a leaf with three marked lesions and measurement ticks" className="hidden h-auto w-full sm:block">
        <defs>
          <linearGradient id="lf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7d9a58" />
            <stop offset="1" stopColor="#4f6b3a" />
          </linearGradient>
        </defs>
        {/* plate */}
        <rect x="0.75" y="0.75" width="598.5" height="598.5" rx="14" fill="#fdfbf7" stroke="#1f1b16" strokeOpacity="0.14" />
        {/* ruler ticks along the left edge */}
        {Array.from({ length: 29 }).map((_, i) => (
          <line key={i} x1="24" x2={i % 5 === 0 ? 42 : 34} y1={60 + i * 16} y2={60 + i * 16} stroke="#1f1b16" strokeOpacity="0.35" />
        ))}
        <text x="24" y="44" className="fill-ink-3" fontFamily="var(--font-meta)" fontSize="11">cm</text>
        {/* leaf */}
        <g transform="translate(100 52)">
          <path className="plate-rise" style={dl(0)} d="M190 20C318 52 372 190 292 322 246 398 206 452 190 470 174 452 130 400 84 322 8 190 62 52 190 20Z" fill="url(#lf)" />
          <path pathLength={1} className="plate-draw" style={dl(250)} d="M190 470V44" stroke="#c9d6a8" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" />
          {[110, 170, 230, 290, 350].map((y, i) => (
            <g key={y} className="plate-fade" style={dl(450 + i * 70)} stroke="#c9d6a8" strokeOpacity="0.5" strokeWidth="1.6" fill="none" strokeLinecap="round">
              <path d={`M190 ${y + 70} C ${230 + i * -4} ${y + 40} ${262 - i * 8} ${y + 10} ${284 - i * 14} ${y - 10}`} />
              <path d={`M190 ${y + 70} C ${150 - i * -4} ${y + 40} ${118 + i * 8} ${y + 10} ${96 + i * 14} ${y - 10}`} />
            </g>
          ))}
          {/* lesions: halo then dead tissue */}
          <g className="plate-pop" style={dl(800)}>
            <path d="M104 196c-22 8-30 40-8 58 22 14 52-2 54-26 0-26-26-42-46-32Z" fill="#d6c76a" fillOpacity="0.55" />
            <path d="M110 208c-12 6-14 24-2 34 14 8 30-2 30-16 0-14-14-24-28-18Z" fill="#4a3322" />
          </g>
          <g className="plate-pop" style={dl(950)}>
            <path d="M254 150c-18-10-44 2-46 24-2 24 22 40 44 30 22-12 22-44 2-54Z" fill="#d6c76a" fillOpacity="0.55" />
            <path d="M246 164c-10-6-24 2-24 14 0 14 14 22 26 16 12-6 10-24-2-30Z" fill="#4a3322" />
          </g>
          <g className="plate-pop" style={dl(1100)}>
            <path d="M226 318c-14 0-30 16-24 34 8 20 36 22 48 6 10-16 0-40-24-40Z" fill="#d6c76a" fillOpacity="0.55" />
            <path d="M230 330c-8 0-14 8-12 16 4 8 16 10 22 2 4-8-2-18-10-18Z" fill="#4a3322" />
          </g>
        </g>
        {/* callouts */}
        <g stroke="#a33f28" strokeWidth="1.25" fill="none">
          <path pathLength={1} className="plate-draw" style={dl(1250)} d="M200 270 L112 270 L112 252" />
          <path pathLength={1} className="plate-draw" style={dl(1350)} d="M340 226 L438 226" />
          <path pathLength={1} className="plate-draw" style={dl(1450)} d="M316 390 L438 390" />
        </g>
        <g fill="#a33f28" className="plate-fade" style={dl(1250)}>
          <circle cx="202" cy="270" r="3" />
          <circle cx="340" cy="226" r="3" />
          <circle cx="316" cy="390" r="3" />
        </g>
        <g className="plate-fade fill-ink" style={dl(1600)} fontFamily="var(--font-meta)" fontSize="11.5" stroke="#fdfbf7" strokeWidth="4" paintOrder="stroke">
          <text x="446" y="222">Dark lesion</text>
          <text x="446" y="237" className="fill-ink-3">pale halo around it</text>
          <text x="446" y="386">Spreads from edge</text>
          <text x="446" y="401" className="fill-ink-3">toward the midrib</text>
          <text x="52" y="226" className="fill-ink-3">Lesion with</text><text x="52" y="241" className="fill-ink-3">pale halo</text>
        </g>
        <text x="576" y="580" textAnchor="end" fontFamily="var(--font-meta)" fontSize="11" className="fill-ink-3">Plate 01 · illustration, not a marked scan</text>
      </svg>
      <svg viewBox="130 30 340 520" role="img" aria-label="Illustration of a leaf with three dark lesions, each with a pale halo" className="block h-auto w-full sm:hidden">
        <defs>
          <linearGradient id="lf2" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7d9a58" />
            <stop offset="1" stopColor="#4f6b3a" />
          </linearGradient>
        </defs>
        {/* plate */}
        <rect x="0.75" y="0.75" width="598.5" height="598.5" rx="14" fill="#fdfbf7" stroke="#1f1b16" strokeOpacity="0.14" />
                {/* leaf */}
        <g transform="translate(100 52)">
          <path className="plate-rise" d="M190 20C318 52 372 190 292 322 246 398 206 452 190 470 174 452 130 400 84 322 8 190 62 52 190 20Z" fill="url(#lf2)" />
          <path pathLength={1} className="plate-draw" style={dl(250)} d="M190 470V44" stroke="#c9d6a8" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" />
          {[110, 170, 230, 290, 350].map((y, i) => (
            <g key={y} className="plate-fade" style={dl(450 + i * 70)} stroke="#c9d6a8" strokeOpacity="0.5" strokeWidth="1.6" fill="none" strokeLinecap="round">
              <path d={`M190 ${y + 70} C ${230 + i * -4} ${y + 40} ${262 - i * 8} ${y + 10} ${284 - i * 14} ${y - 10}`} />
              <path d={`M190 ${y + 70} C ${150 - i * -4} ${y + 40} ${118 + i * 8} ${y + 10} ${96 + i * 14} ${y - 10}`} />
            </g>
          ))}
          {/* lesions: halo then dead tissue */}
          <g>
            <path d="M104 196c-22 8-30 40-8 58 22 14 52-2 54-26 0-26-26-42-46-32Z" fill="#d6c76a" fillOpacity="0.55" />
            <path d="M110 208c-12 6-14 24-2 34 14 8 30-2 30-16 0-14-14-24-28-18Z" fill="#4a3322" />
          </g>
          <g>
            <path d="M254 150c-18-10-44 2-46 24-2 24 22 40 44 30 22-12 22-44 2-54Z" fill="#d6c76a" fillOpacity="0.55" />
            <path d="M246 164c-10-6-24 2-24 14 0 14 14 22 26 16 12-6 10-24-2-30Z" fill="#4a3322" />
          </g>
          <g>
            <path d="M226 318c-14 0-30 16-24 34 8 20 36 22 48 6 10-16 0-40-24-40Z" fill="#d6c76a" fillOpacity="0.55" />
            <path d="M230 330c-8 0-14 8-12 16 4 8 16 10 22 2 4-8-2-18-10-18Z" fill="#4a3322" />
          </g>
        </g>
        </svg>
      <figcaption className="label mt-3 sm:hidden">Plate 01 · illustration, not a marked scan. The report lists symptoms in words; it does not draw on your photo</figcaption>
    </figure>
  );
}
