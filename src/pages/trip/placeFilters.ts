import type { Attraction, JointPreference } from '../../types';

export type PlaceFilter = 'all' | 'saved' | 'mine' | 'partner' | 'opposite';

type PlaceFilterInput = {
  attractions: Attraction[];
  filter: PlaceFilter;
  mine?: JointPreference;
  counterpart?: JointPreference | null;
  mineTtiCode?: string | null;
  counterpartTtiCode?: string | null;
};

export function filterAttractions({
  attractions,
  filter,
  mine,
  counterpart,
  mineTtiCode,
  counterpartTtiCode,
}: PlaceFilterInput) {
  if (filter === 'all') return attractions;
  if (filter === 'saved') return attractions.filter((place) => place.saved);

  const preferences = filter === 'mine' ? mine : filter === 'partner' ? counterpart : undefined;
  const ttiCode = filter === 'mine'
    ? mineTtiCode
    : filter === 'partner'
      ? counterpartTtiCode
      : oppositeTtiCode(mineTtiCode);

  if (!hasSignals(preferences, ttiCode)) return [];

  return attractions
    .map((place, index) => ({ place, index, score: affinityScore(place, preferences, ttiCode) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map(({ place }) => place);
}

export function oppositeTtiCode(code?: string | null) {
  if (!code || !/^[PW][NC][FA][HS]$/.test(code)) return undefined;
  const opposite: Record<string, string> = { P: 'W', W: 'P', N: 'C', C: 'N', F: 'A', A: 'F', H: 'S', S: 'H' };
  return [...code].map((letter) => opposite[letter]).join('');
}

function affinityScore(place: Attraction, preferences?: JointPreference | null, ttiCode?: string | null) {
  const text = normalize([place.name, place.category, place.description, place.reason, ...place.tags].filter(Boolean).join(' '));
  const preferenceTerms = preferences
    ? [...preferences.places, ...preferences.activities, ...preferences.foods].map(normalize).filter(Boolean)
    : [];
  let score = preferenceTerms.reduce((sum, term) => sum + (text.includes(term) ? 6 : 0), 0);

  if (preferences?.indoorPreferred && place.indoor) score += 4;
  if (preferences?.hiddenSpots && isHiddenPlace(place)) score += 4;
  if (!ttiCode || !/^[PW][NC][FA][HS]$/.test(ttiCode)) return score;

  const [planning, novelty, activity, fame] = ttiCode;
  if (planning === 'P' && hasAny(text, ['즉흥형장소', '예약없이', '산책'])) score += 2;
  if (planning === 'W' && hasAny(text, ['계획형장소', '예약', '코스'])) score += 2;
  if (novelty === 'N' && (hasAny(text, ['새로움', '로컬', '골목']) || isHiddenPlace(place))) score += 3;
  if (novelty === 'C' && (hasAny(text, ['검증됨', '공공데이터']) || place.famous)) score += 3;
  if (activity === 'F' && (!place.active || hasAny(text, ['휴식형', '카페', '공원']))) score += 3;
  if (activity === 'A' && (place.active || hasAny(text, ['활동형', '체험', '축제']))) score += 3;
  if (fame === 'H' && isHiddenPlace(place)) score += 4;
  if (fame === 'S' && (place.famous || hasAny(text, ['대표명소형', '랜드마크', '필수코스']))) score += 4;
  return score;
}

function hasSignals(preferences?: JointPreference | null, ttiCode?: string | null) {
  return Boolean(
    (ttiCode && /^[PW][NC][FA][HS]$/.test(ttiCode))
    || preferences?.places.length
    || preferences?.activities.length
    || preferences?.foods.length
    || preferences?.indoorPreferred
    || preferences?.hiddenSpots,
  );
}

function isHiddenPlace(place: Attraction) {
  return !place.famous || (place.hiddenScore ?? 0) >= 55 || place.tags.some((tag) => /숨은|로컬/.test(tag));
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(normalize(term)));
}

function normalize(value: string) {
  return value.toLocaleLowerCase('ko-KR').replace(/\s+/g, '');
}
