import type { JointPreference, PairPreferences, TripSummary } from '../../../types';

const AREA_CODES: Array<[RegExp, string]> = [
  [/서울/i, '1'],
  [/인천/i, '2'],
  [/대전/i, '3'],
  [/대구/i, '4'],
  [/광주/i, '5'],
  [/부산/i, '6'],
  [/울산/i, '7'],
  [/세종/i, '8'],
  [/경기/i, '31'],
  [/강원/i, '32'],
  [/충북|충청북도/i, '33'],
  [/충남|충청남도/i, '34'],
  [/경북|경상북도/i, '35'],
  [/경남|경상남도/i, '36'],
  [/전북|전라북도|전북특별자치도/i, '37'],
  [/전남|전라남도/i, '38'],
  [/제주/i, '39'],
];

export function mergePairPreferences(pair: PairPreferences): JointPreference | undefined {
  const mine = pair.mine?.preferences;
  const counterpart = pair.counterpart?.preferences;
  if (!mine || !counterpart) return undefined;

  return {
    places: unique([...mine.places, ...counterpart.places]),
    activities: unique([...mine.activities, ...counterpart.activities]),
    foods: unique([...mine.foods, ...counterpart.foods]),
    pace: average(mine.pace, counterpart.pace),
    budget: average(mine.budget, counterpart.budget),
    indoorPreferred: mine.indoorPreferred || counterpart.indoorPreferred,
    hiddenSpots: mine.hiddenSpots || counterpart.hiddenSpots,
  };
}

export function tourAreaCode(region?: string | null) {
  return AREA_CODES.find(([pattern]) => pattern.test(region ?? ''))?.[1] ?? '1';
}

export function tripDurationDays(trip?: Pick<TripSummary, 'startDate' | 'endDate'>) {
  if (!trip?.startDate || !trip.endDate) return 3;
  const start = new Date(trip.startDate);
  const end = new Date(trip.endDate);
  const days = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
  return Number.isFinite(days) ? Math.min(30, Math.max(1, days)) : 3;
}

function unique(items: string[]) {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function average(left: number, right: number) {
  return Math.round((left + right) / 2);
}
