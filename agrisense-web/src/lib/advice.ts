/*
 * Defence in depth. The server already removes these; this keeps an older or mocked payload
 * from showing them. Recovery text is never shown: no source backs a recovery forecast.
 */
const BURN = /\b(burn|burns|burnt|burned|burning|incinerat\w*)\b/i;
const SCHEDULE =
  /\b(every|each)\s+\d+(\s*-\s*\d+)?\s*(hours?|days?|weeks?|months?)\b|\b(daily|weekly|fortnightly)\b|\b(once|twice|thrice)\s+(a|per|every|each)\s+(day|week|month)\b|\b\d+\s*times\s+(a|per|every|each)\b/i;

export const unsupported = (t: string) => BURN.test(t) || SCHEDULE.test(t);

export function safeText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .split(/(?<=[.!?\n])\s+/)
    .filter((p) => !unsupported(p))
    .join(' ')
    .trim();
}

export const safeList = (items: string[] | undefined | null): string[] =>
  (items ?? []).filter((i) => typeof i === 'string' && !unsupported(i));
