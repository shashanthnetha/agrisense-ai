import Link from 'next/link';
export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-sheet">
      <div className="wrap grid gap-6 py-10 text-[13px] leading-[20px] text-ink-2 md:grid-cols-[1fr_auto]">
        <p className="max-w-[60ch]">
          AgriSense gives a tentative, AI-assisted reading of one photo. It is not a diagnosis and does not prescribe sprays or doses. Confirm with a local agriculture officer.
          Sample photo: &ldquo;Early blight on tomato leaves&rdquo; by Dwight Sipler, <a className="underline" href="https://creativecommons.org/licenses/by/2.0/">CC BY 2.0</a>, via{' '}
          <a className="underline" href="https://commons.wikimedia.org/wiki/File:Early_blight_on_tomato_leaves_(7871930010).jpg">Wikimedia Commons</a>. Used as scenery, not as a reading by AgriSense.
        </p>
        <nav aria-label="Footer" className="flex gap-6">
          <Link href="/guide" className="underline-offset-4 hover:underline">Photo guide</Link>
          <Link href="/limits" className="underline-offset-4 hover:underline">Before you spray</Link>
          <Link href="/scan" className="underline-offset-4 hover:underline">Scan</Link>
        </nav>
      </div>
    </footer>
  );
}
