import { describe, expect, it } from 'vitest';
import type { Attraction, JointPreference } from '../../types';
import { filterAttractions, oppositeTtiCode } from './placeFilters';

function place(id: string, patch: Partial<Attraction> = {}): Attraction {
  return {
    id,
    name: id,
    category: '관광지',
    tags: [],
    indoor: false,
    active: false,
    famous: false,
    saved: false,
    excluded: false,
    ...patch,
  };
}

const preferences: JointPreference = {
  places: ['시장'],
  activities: ['산책'],
  foods: [],
  pace: 50,
  budget: 50,
  indoorPreferred: false,
  hiddenSpots: true,
};

describe('place filters', () => {
  it('keeps shared saved places as the server-backed common preference filter', () => {
    const items = [place('one', { saved: true }), place('two')];
    expect(filterAttractions({ attractions: items, filter: 'saved' }).map((item) => item.id)).toEqual(['one']);
  });

  it('ranks places using the selected traveler preferences and TTI traits', () => {
    const items = [
      place('대표 전망대', { famous: true, active: true, tags: ['대표 명소형'] }),
      place('골목 시장', { description: '동네 산책 코스', hiddenScore: 80, tags: ['숨은 명소 후보'] }),
    ];
    expect(filterAttractions({ attractions: items, filter: 'mine', mine: preferences, mineTtiCode: 'PNFH' }).map((item) => item.id)).toEqual(['골목 시장']);
  });

  it('uses the opposite of the current TTI code for the experience filter', () => {
    expect(oppositeTtiCode('PNFH')).toBe('WCAS');
    const items = [
      place('활동 명소', { famous: true, active: true, tags: ['검증됨', '대표 명소형'] }),
      place('숨은 쉼터', { hiddenScore: 80, tags: ['휴식형'] }),
    ];
    expect(filterAttractions({ attractions: items, filter: 'opposite', mineTtiCode: 'PNFH' })[0].id).toBe('활동 명소');
  });

  it('returns no inferred results when the traveler has no preference or TTI signal', () => {
    expect(filterAttractions({ attractions: [place('one')], filter: 'partner' })).toEqual([]);
  });
});
