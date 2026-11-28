/* Shown only in preview builds (NEXT_PUBLIC_PREVIEW_SAMPLE=1): marks every screen as test data. */
export function PreviewBanner() {
  if (process.env.NEXT_PUBLIC_PREVIEW_SAMPLE !== '1') return null;
  return (
    <div role="note" className="sticky top-0 z-50 bg-[#ffd36a] px-3 py-1 text-center font-mono text-[10px] leading-[14px] sm:px-4 sm:py-1.5 sm:text-[11px] uppercase tracking-wide text-night">
      Design preview · sample photo, test data · not a real reading
    </div>
  );
}
