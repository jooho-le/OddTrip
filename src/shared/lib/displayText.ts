import type { TripSummary } from '../../types';

const UNRESOLVED_TEXT = /\?{2,}|\uFFFD/;
const EMPTY_SENTINEL = /^(?:null|undefined|n\/?a)$/i;

export function meaningfulText(value?: string | null) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || UNRESOLVED_TEXT.test(text) || EMPTY_SENTINEL.test(text)) return null;
  return text;
}

export function displayText(value: string | null | undefined, fallback: string) {
  return meaningfulText(value) ?? fallback;
}

export function normalizeTripSummary(trip: TripSummary): TripSummary {
  return {
    ...trip,
    title: meaningfulText(trip.title),
    region: meaningfulText(trip.region),
  };
}
