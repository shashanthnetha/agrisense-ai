const IMG = '/early-blight-sample.jpg';
const FRAMES = [
  { n: '01', title: 'The whole leaf', note: 'The whole sample photo, for scale.', x: 0.5, y: 0.5, z: 1 },
  { n: '02', title: 'A spot, close', note: 'A dark patch with a yellow edge, sharp enough to see its rim.', x: 0.83, y: 0.66, z: 3.2 },
  { n: '03', title: 'A smaller mark', note: 'Small details only show when the photo is taken close.', x: 0.5, y: 0.49, z: 3.2 },
  { n: '04', title: 'Another area of the sample', note: 'Leaf around the marks, for comparison. Not a health check.', x: 0.2, y: 0.36, z: 3.2 },
];

/* A contact sheet of crops of the one sample photo: what "close enough" looks like. Crops only, nothing is marked or measured. */
export function ContactSheet() {
  return (
    <ol className="grid grid-cols-2 gap-x-4 gap-y-8 lg:grid-cols-4 lg:gap-x-6">
      {FRAMES.map((f) => (
        <li key={f.n}>
          <div
            role="img"
            aria-label={f.title + ', a crop of the sample photo'}
            className="relative aspect-[4/5] w-full overflow-hidden rounded-[2px] border border-bone/30 bg-night"
            style={{
              backgroundImage: `url(${IMG})`,
              backgroundRepeat: 'no-repeat',
              backgroundSize: f.z === 1 ? 'cover' : `${f.z * 100}% auto`,
              backgroundPosition: `${f.z === 1 ? 62 : ((f.x * f.z - 0.5) / (f.z - 1)) * 100}% ${f.z === 1 ? 50 : ((f.y * f.z - 0.5) / (f.z - 1)) * 100}%`,
            }}
          >
            <span className="absolute left-2 top-2 rounded-[2px] bg-night/80 px-1.5 py-0.5 font-mono text-[11px] text-lime">{f.n}</span>
          </div>
          <p className="head mt-3 text-[18px] text-bone">{f.title}</p>
          <p className="mt-1 max-w-[30ch] text-[14px] leading-[21px] text-bone/70">{f.note}</p>
        </li>
      ))}
    </ol>
  );
}
