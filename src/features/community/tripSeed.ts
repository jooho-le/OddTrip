import type { TripSummary } from '../../types';
import { emptyInput, type PostInput } from './communityModel';

/** 여행에서 출발한 글쓰기에 채워 넣는 정보.
 *
 * 두 곳에서 만든다. `/my`의 "이 여행으로 글쓰기"는 라우터 state로 넘기고, 후기
 * 리마인더 알림은 링크만 들고 오므로 글쓰기 화면이 여행을 서버에서 읽어 만든다.
 * 두 경로가 같은 화면을 보여야 해서 모양을 여기 한 곳에 둔다.
 */
export type TripWritingSeed = { tripId: string; title: string; region: string; startDate: string; endDate: string; partner: string };

export function isTripWritingSeed(value: unknown): value is TripWritingSeed {
  if (!value || typeof value !== 'object') return false;
  const seed = value as Record<string, unknown>;
  return ['tripId', 'title', 'region', 'startDate', 'endDate', 'partner'].every((key) => typeof seed[key] === 'string');
}

export function toTripWritingSeed(trip: TripSummary): TripWritingSeed {
  return {
    tripId: trip.tripId,
    title: trip.title || `${trip.partner?.nickname ?? '동행'}과 함께하는 ${trip.region ?? 'OddTrip'} 여행`,
    region: trip.region ?? '',
    startDate: trip.startDate ?? '',
    endDate: trip.endDate ?? '',
    partner: trip.partner?.nickname ?? '',
  };
}

/** 여행에서 시작한 글의 첫 입력. 제목과 태그만 미리 채우고 본문은 비워 둔다. */
export function tripSeedInput(seed: TripWritingSeed): PostInput {
  const region = seed.region.trim();
  const title = `${region || seed.title} 여행에서 남은 이야기`.slice(0, 80);
  return { ...emptyInput(), title, region, tags: [region, '여행기'].filter(Boolean) };
}

export function tripSeedDate(seed: TripWritingSeed) {
  if (!seed.startDate && !seed.endDate) return seed.region || '날짜 미정';
  return [seed.startDate, seed.endDate].filter(Boolean).join(' — ');
}
