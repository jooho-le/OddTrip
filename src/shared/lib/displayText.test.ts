import { describe, expect, it } from 'vitest';
import { displayText, meaningfulText, normalizeTripSummary } from './displayText';

describe('displayText', () => {
  it('replaces unresolved API placeholders with an intentional label', () => {
    expect(displayText('??', '지역 미정')).toBe('지역 미정');
    expect(displayText('두 사람의 ?? 여행', '여행 제목 미정')).toBe('여행 제목 미정');
    expect(displayText('\uFFFD\uFFFD', '정보 미제공')).toBe('정보 미제공');
  });

  it('keeps meaningful text including a normal question', () => {
    expect(meaningfulText('서울')).toBe('서울');
    expect(meaningfulText('어디로 갈까?')).toBe('어디로 갈까?');
  });

  it('normalizes unresolved trip fields at the API boundary', () => {
    const trip = normalizeTripSummary({
      tripId: 'trip-1',
      matchId: 'match-1',
      title: '두 사람의 ?? 여행',
      region: '??',
      status: 'planning',
      attractionCount: 0,
      savedCount: 0,
      itineraryDayCount: 0,
    });

    expect(trip.title).toBeNull();
    expect(trip.region).toBeNull();
  });
});
