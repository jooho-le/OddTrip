/** 서버가 준 시각 문자열을 Date로 바꾼다.
 *
 * 서버는 시각을 UTC로 계산하면서 시간대 표시 없이 내려준다(`2026-09-18T14:21:09`).
 * 자바스크립트는 시간대가 없는 값을 "브라우저가 있는 곳의 시간"으로 읽기 때문에,
 * 그대로 넘기면 한국에서 정확히 9시간이 어긋난다. 방금 올라온 위치가 "540분 전"이
 * 되는 식이다. 그래서 시간대 표시가 없으면 UTC로 못 박아 준다.
 *
 * 날짜만 있는 값(`2026-09-20`)은 그대로 둔다. 이미 UTC 자정으로 읽히고, 날짜로
 * 표시할 때 한국 시간에서도 같은 날이 된다.
 */
export function parseServerDate(value: string) {
  const hasZone = /[Zz]$|[+-]\d{2}:?\d{2}$/.test(value);
  return new Date(hasZone || !value.includes('T') ? value : `${value}Z`);
}

export function formatClockTime(iso: string) {
  const date = parseServerDate(iso);
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export function formatRelativeTime(iso: string) {
  const date = parseServerDate(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return '방금';
  if (diffMin < 60) return `${diffMin}분 전`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}시간 전`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}일 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export function formatDateLabel(iso: string) {
  return parseServerDate(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' });
}
