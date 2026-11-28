export function PageHero({ label, title, children }: { label: string; title: string; children?: React.ReactNode }) {
  return (
    <section className="dark-surface relative isolate overflow-hidden bg-leaf text-bone">
      <svg aria-hidden viewBox="0 0 400 400" fill="none" stroke="currentColor" className="pointer-events-none absolute -right-24 -top-32 -z-10 h-[520px] w-[520px] text-lime opacity-[0.08]">
        {[30, 62, 98, 138, 182, 230, 282].map((r, i) => <circle key={r} cx="200" cy="200" r={r} strokeWidth={i === 2 ? 1.5 : 1} strokeDasharray={i % 3 === 1 ? '2 7' : undefined} />)}
      </svg>
      <div className="wrap py-12 sm:py-16">
        <p className="label !text-lime">{label}</p>
        <h1 className="head mt-4 max-w-[20ch] text-[clamp(34px,4.8vw,62px)]">{title}</h1>
        {children && <p className="mt-5 max-w-[40rem] text-[17px] leading-[27px] text-bone/80">{children}</p>}
      </div>
    </section>
  );
}
