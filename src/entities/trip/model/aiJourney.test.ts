import { describe, expect, it } from 'vitest';
import type { PairPreferences } from '../../../types';
import { mergePairPreferences, tourAreaCode, tripDurationDays } from './aiJourney';

describe('AI journey input', () => {
  it('combines both submitted preferences without a proposal or approval step', () => {
    const pair: PairPreferences = {
      tripId: 'trip-1',
      bothSubmitted: true,
      mine: { userId: 'me', preferences: { places: ['전시'], activities: ['산책'], foods: ['현지식'], pace: 40, budget: 60, indoorPreferred: true, hiddenSpots: false } },
      counterpart: { userId: 'partner', preferences: { places: ['시장', '전시'], activities: ['미식'], foods: ['가격'], pace: 80, budget: 40, indoorPreferred: false, hiddenSpots: true } },
    };

    expect(mergePairPreferences(pair)).toEqual({
      places: ['전시', '시장'],
      activities: ['산책', '미식'],
      foods: ['현지식', '가격'],
      pace: 60,
      budget: 50,
      indoorPreferred: true,
      hiddenSpots: true,
    });
  });

  it('uses the trip region and duration for the AI request', () => {
    expect(tourAreaCode('부산광역시')).toBe('6');
    expect(tourAreaCode('제주특별자치도')).toBe('39');
    expect(tripDurationDays({ startDate: '2026-09-20', endDate: '2026-09-22' })).toBe(3);
  });
});
