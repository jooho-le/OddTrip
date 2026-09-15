import type { Attraction } from '../../types';

/**
 * The backend has no endpoint that generates three distinct itineraries yet
 * (`POST /itinerary/generate` always produces one, using the single shared
 * `preferences_json`). Until that exists, these "proposals" are a client-side
 * re-ranking of the same recommended attraction list — real data, different
 * ordering/emphasis — not three independently generated plans.
 */

export type ProposalVariantId = 'balanced' | 'challenge' | 'stable';

export const PROPOSAL_VARIANTS: { id: ProposalVariantId; title: string; description: string }[] = [
  { id: 'balanced', title: '균형형', description: '추천된 순서를 그대로 따라가는, 두 성향의 중간 지점에 가까운 구성이에요.' },
  { id: 'challenge', title: '도전형', description: '숨은 명소와 실외 활동 비중을 높여 새로운 자극을 더 넣은 구성이에요.' },
  { id: 'stable', title: '안정형', description: '혼잡도가 낮고 잘 알려진 장소 위주로 안정적인 동선을 짠 구성이에요.' },
];

export function buildProposalItems(attractions: Attraction[], variant: ProposalVariantId, limit = 6): Attraction[] {
  const active = attractions.filter((item) => !item.excluded);
  const sorted = [...active];

  if (variant === 'challenge') {
    sorted.sort((a, b) => (b.hiddenScore ?? 0) - (a.hiddenScore ?? 0) || Number(a.famous) - Number(b.famous));
  } else if (variant === 'stable') {
    sorted.sort((a, b) => (a.congestionScore ?? 100) - (b.congestionScore ?? 100) || Number(b.famous) - Number(a.famous));
  }

  return sorted.slice(0, limit);
}

export function summarizeProposal(items: Attraction[]) {
  if (!items.length) {
    return { indoorRatio: 0, avgHidden: null as number | null, avgCongestion: null as number | null, count: 0 };
  }
  const indoorCount = items.filter((item) => item.indoor).length;
  const hiddenScores = items.map((item) => item.hiddenScore).filter((value): value is number => value != null);
  const congestionScores = items.map((item) => item.congestionScore).filter((value): value is number => value != null);

  return {
    indoorRatio: Math.round((indoorCount / items.length) * 100),
    avgHidden: hiddenScores.length ? Math.round(hiddenScores.reduce((sum, value) => sum + value, 0) / hiddenScores.length) : null,
    avgCongestion: congestionScores.length ? Math.round(congestionScores.reduce((sum, value) => sum + value, 0) / congestionScores.length) : null,
    count: items.length,
  };
}
