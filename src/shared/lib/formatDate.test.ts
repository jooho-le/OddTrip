import { describe, expect, it } from 'vitest';
import { formatRelativeTime, parseServerDate } from './formatDate';

/** 서버가 보내는 모양: UTC로 계산했지만 시간대 표시가 없다. */
function serverStamp(msAgo: number) {
  return new Date(Date.now() - msAgo).toISOString().replace('Z', '');
}

describe('server timestamps', () => {
  it('reads a stamp without a timezone as UTC, not as local time', () => {
    // 이 처리를 빼면 한국에서 9시간이 어긋나, 방금 올라온 위치가 "540분 전"이 된다.
    expect(parseServerDate('2026-09-18T14:21:09').getTime()).toBe(Date.parse('2026-09-18T14:21:09Z'));
    expect(parseServerDate('2026-09-18T14:21:09.003198').getTime()).toBe(Date.parse('2026-09-18T14:21:09.003Z'));
  });

  it('leaves a stamp that already carries a timezone alone', () => {
    expect(parseServerDate('2026-09-18T14:21:09Z').getTime()).toBe(Date.parse('2026-09-18T14:21:09Z'));
    expect(parseServerDate('2026-09-18T23:21:09+09:00').getTime()).toBe(Date.parse('2026-09-18T14:21:09Z'));
  });

  it('leaves a date without a time alone', () => {
    // 여행 시작일 같은 값이다. 이미 UTC 자정으로 읽히고 한국에서도 같은 날이다.
    expect(parseServerDate('2026-09-20').getTime()).toBe(Date.parse('2026-09-20'));
  });

  it('reports how long ago a server stamp was, in any browser timezone', () => {
    expect(formatRelativeTime(serverStamp(0))).toBe('방금');
    expect(formatRelativeTime(serverStamp(5 * 60_000))).toBe('5분 전');
    expect(formatRelativeTime(serverStamp(3 * 3_600_000))).toBe('3시간 전');
  });
});
