import type { MatchRequest, TripSummary } from '../../types';

export type DatedMatchRequest = {
  request: MatchRequest;
  direction: 'received' | 'sent';
};

export function sortTripsByRecent(trips: TripSummary[]) {
  return [...trips].sort((left, right) => recentTimestamp(right) - recentTimestamp(left));
}

export function selectScheduleRequests(
  received: MatchRequest[],
  sent: MatchRequest[],
  activeTrip?: TripSummary,
  now = new Date(),
) {
  const unique = new Map<string, DatedMatchRequest>();
  received.forEach((request) => unique.set(request.id, { request, direction: 'received' }));
  sent.forEach((request) => {
    if (!unique.has(request.id)) unique.set(request.id, { request, direction: 'sent' });
  });

  const activeRange = validRange(activeTrip?.startDate, activeTrip?.endDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return [...unique.values()]
    .filter(({ request }) => request.status === 'pending' || request.status === 'accepted')
    .filter(({ request }) => {
      const requestRange = validRange(request.startDate, request.endDate);
      if (!requestRange) return false;
      if (activeRange) return rangesOverlap(activeRange, requestRange);
      return requestRange.end >= today;
    })
    .sort((left, right) => {
      const dateOrder = dateTimestamp(left.request.startDate) - dateTimestamp(right.request.startDate);
      return dateOrder || dateTimestamp(right.request.createdAt) - dateTimestamp(left.request.createdAt);
    });
}

export function rangesOverlap(
  left: { start: number; end: number },
  right: { start: number; end: number },
) {
  return left.start <= right.end && right.start <= left.end;
}

function validRange(start?: string | null, end?: string | null) {
  const startTime = dateTimestamp(start);
  const endTime = dateTimestamp(end);
  if (!startTime || !endTime || startTime > endTime) return undefined;
  return { start: startTime, end: endTime };
}

function recentTimestamp(trip: TripSummary) {
  return dateTimestamp(trip.createdAt) || dateTimestamp(trip.startDate);
}

function dateTimestamp(value?: string | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}
